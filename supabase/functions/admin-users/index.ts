import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: missing credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Validate Caller Authentication & ADMIN Role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify token using caller client
    const callerClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize privileged admin client for server-side operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check caller's role in profiles table
    const { data: callerProfile, error: profileCheckError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (profileCheckError || callerProfile?.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Process Requested Admin Action
    const body = await req.json();
    const action = body.action;

    // ---------------------------------------------------------
    // Action: Add / Create Whitelist User
    // ---------------------------------------------------------
    if (action === 'addWhitelistUser' || action === 'create') {
      const userData = body.user || body;
      const { email, password, name, role, grade, subject, phone } = userData;

      if (!email || !password || !name || !role) {
        return new Response(JSON.stringify({ error: 'Missing required user fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create user in auth schema
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        return new Response(JSON.stringify({ error: authError?.message || 'Failed to create user in auth' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newUserId = authData.user.id;

      // Create profile record
      const profilePayload = {
        id: newUserId,
        email,
        name,
        role,
        grade: role === 'STUDENT' ? (grade || null) : null,
        subject: role === 'TEACHER' ? (subject || null) : null,
        phone: role === 'TEACHER' ? (phone || null) : null,
      };

      const { data: profileData, error: profileError } = await adminClient
        .from('profiles')
        .insert(profilePayload)
        .select()
        .single();

      if (profileError) {
        // Rollback created auth user
        await adminClient.auth.admin.deleteUser(newUserId);
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ user: authData.user, profile: profileData, success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---------------------------------------------------------
    // Action: Update Whitelist User
    // ---------------------------------------------------------
    if (action === 'adminUpdateUser' || action === 'update') {
      const targetUserId = body.userId;
      const updates = body.updates || {};

      if (!targetUserId) {
        return new Response(JSON.stringify({ error: 'Missing userId parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update auth credentials if provided
      const authUpdates: { email?: string; password?: string } = {};
      if (updates.email) authUpdates.email = updates.email;
      if (updates.password) authUpdates.password = updates.password;

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await adminClient.auth.admin.updateUserById(targetUserId, authUpdates);
        if (authError) {
          return new Response(JSON.stringify({ error: authError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Determine updated or existing role
      let currentRole = updates.role;
      if (!currentRole) {
        const { data: existingUser } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', targetUserId)
          .single();
        currentRole = existingUser?.role;
      }

      // Format profile updates based on role
      const profileUpdates: Record<string, any> = {};
      if (updates.name !== undefined) profileUpdates.name = updates.name;
      if (updates.role !== undefined) profileUpdates.role = updates.role;
      if (updates.email !== undefined) profileUpdates.email = updates.email;

      if (currentRole === 'TEACHER') {
        profileUpdates.subject = updates.subject || null;
        profileUpdates.phone = updates.phone || null;
        profileUpdates.grade = null;
      } else if (currentRole === 'STUDENT') {
        profileUpdates.grade = updates.grade || null;
        profileUpdates.subject = null;
        profileUpdates.phone = null;
      } else if (currentRole === 'ADMIN') {
        profileUpdates.grade = null;
        profileUpdates.subject = null;
        profileUpdates.phone = null;
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { data: updatedProfile, error: profileError } = await adminClient
          .from('profiles')
          .update(profileUpdates)
          .eq('id', targetUserId)
          .select()
          .single();

        if (profileError) {
          return new Response(JSON.stringify({ error: profileError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ profile: updatedProfile, success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---------------------------------------------------------
    // Action: Delete Whitelist User
    // ---------------------------------------------------------
    if (action === 'deleteWhitelistUser' || action === 'delete') {
      const targetUserId = body.userId;
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: 'Missing userId parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unsupported action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
