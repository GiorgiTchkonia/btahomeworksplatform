import { createClient } from "npm:@supabase/supabase-js@2.116.0";

function nullableText(value: unknown): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('არასწორი ველის ტიპი.');
  return value.trim() || null;
}

function subjectList(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.length || value.length>12) return null;
  const result: string[]=[];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim() || item.trim().length>100) return null;
    if (!result.some(name=>name.toLowerCase()===item.trim().toLowerCase())) result.push(item.trim());
  }
  return result;
}

function filterValue(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return '{' + value.map(item => '"' + String(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
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

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
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
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
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
    if (!callerUser.email_confirmed_at) return jsonError('ჯერ დაადასტურეთ თქვენი ელფოსტა.', 403);
    const { data: accountState, error: activationError } = await callerClient.rpc('get_my_account_state');
    if (activationError || accountState !== 'ACTIVE') return jsonError('ჯერ დაასრულეთ ანგარიშის გააქტიურება და დააყენეთ პაროლი.', 403);

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
    let body;
    try { body = await req.json(); } catch { return jsonError('არასწორი JSON მოთხოვნა.', 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('არასწორი მოთხოვნა.', 400);
    const action = body.action;

    // ---------------------------------------------------------
    // Action: Add / Create Whitelist User
    // ---------------------------------------------------------
    if (action === 'addWhitelistUser' || action === 'create') {
      const userData = body.user || body;
      if (typeof userData.email !== 'string' || typeof userData.name !== 'string') return jsonError('არასწორი მომხმარებლის მონაცემები.', 400);
      const email = userData.email.trim().toLowerCase();
      const name = userData.name.trim();
      const { role, grade, subject, phone } = userData;
      const teachingSubjects = role === 'TEACHER' ? subjectList(userData.teaching_subjects ?? (typeof subject === 'string' && subject.trim() ? [subject] : [])) : null;
      if (role === 'TEACHER' && !teachingSubjects) return jsonError('დაამატეთ მასწავლებლის მინიმუმ ერთი საგანი (მაქსიმუმ 12).', 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name
          || !['ADMIN', 'TEACHER', 'STUDENT'].includes(role)) return jsonError('გადაამოწმეთ ელფოსტა, სახელი და როლი.', 400);

      for (const value of [grade, subject, phone]) { if (value !== undefined && value !== null && typeof value !== 'string') return jsonError('არასწორი ველის ტიპი.', 400); }
      let groupId: string | null = null;
      if (role === 'STUDENT') {
        if (typeof userData.group_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(userData.group_id)) return jsonError('სტუდენტისთვის ჯგუფის არჩევა სავალდებულოა.', 400);
        const { data: group, error: groupError } = await adminClient.from('college_groups').select('id,active').eq('id', userData.group_id).maybeSingle();
        if (groupError || !group?.active) return jsonError('აირჩიეთ მოქმედი ჯგუფი.', 400);
        groupId = group.id;
      }

      const appUrl = Deno.env.get('APP_URL');
      let redirectTo: string;
      try {
        if (!appUrl) throw new Error('APP_URL is required');
        const url = new URL(appUrl);
        if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Invalid APP_URL');
        redirectTo = new URL('/accept-invite', url.origin).href;
      } catch {
        return jsonError('მოწვევის გასაგზავნად საჭიროა სერვერის APP_URL კონფიგურაცია.', 500);
      }
      const { data: existingProfile, error: duplicateError } = await adminClient.from('profiles')
        .select('id').eq('email', email).maybeSingle();
      if (duplicateError) return jsonError('მომხმარებლის შემოწმება ვერ მოხერხდა.', 500);
      if (existingProfile) return jsonError('ამ ელფოსტით მომხმარებელი უკვე არსებობს.', 409);

      // Only receipt of the invitation confirms ownership. Do not auto-confirm or
      // give an admin-generated password to a mailbox that has not been verified.
      const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo, data: { name },
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
        teaching_subjects: teachingSubjects,
        group_id: groupId,
        id: newUserId,
        email,
        name,
        role,
        grade: role === 'STUDENT' ? nullableText(grade ?? null) : null,
        subject: role === 'TEACHER' ? nullableText(subject ?? null) : null,
        phone: nullableText(phone ?? null),
      };

      const { data: profileData, error: profileError } = await adminClient
        .from('profiles')
        .insert(profilePayload)
        .select()
        .single();

      if (profileError) {
        // An invitation may already have been sent or another request may have
        // created this profile. Never delete that Auth account on a partial failure.
        console.error('Invited account profile needs reconciliation', { newUserId, error: profileError.message });
        return jsonError('მოწვევა გაიგზავნა, მაგრამ პროფილი ვერ შეინახა. ადმინისტრატორმა უნდა გადაამოწმოს ანგარიში.', 500);
      }

      return new Response(JSON.stringify({ user: authData.user, profile: profileData, invitationSent: true, success: true }), {
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

      if (typeof targetUserId !== 'string' || typeof updates !== 'object' || Array.isArray(updates)) {
        return jsonError('არასწორი მომხმარებელი ან ცვლილებები.', 400);
      }
      for (const key of ['subject', 'grade']) {
        if (updates[key] !== undefined && updates[key] !== null && typeof updates[key] !== 'string') {
          return jsonError('არასწორი ველის ტიპი.', 400);
        }
      }

      if (!targetUserId) {
        return new Response(JSON.stringify({ error: 'Missing userId parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: existing, error: lookupError } = await adminClient
        .from('profiles').select('*').eq('id', targetUserId).single();
      if (lookupError || !existing) return jsonError('მომხმარებელი ვერ მოიძებნა.', 404);
      const currentRole = updates.role ?? existing.role;
      if (!['ADMIN', 'TEACHER', 'STUDENT'].includes(currentRole)) return jsonError('არასწორი როლი.', 400);
      if (targetUserId === callerUser.id && currentRole !== 'ADMIN') return jsonError('საკუთარი ადმინისტრატორის როლის შეცვლა დაუშვებელია.', 400);

      const profileUpdates: Record<string, unknown> = {};
      if (currentRole === 'STUDENT') {
        const nextGroup = updates.group_id === undefined ? existing.group_id : updates.group_id;
        if (typeof nextGroup !== 'string' || !/^[0-9a-f-]{36}$/i.test(nextGroup)) return jsonError('სტუდენტისთვის ჯგუფის არჩევა სავალდებულოა.', 400);
        if (nextGroup !== existing.group_id) {
          const { data: group, error: groupError } = await adminClient.from('college_groups').select('id,active').eq('id', nextGroup).maybeSingle();
          if (groupError || !group?.active) return jsonError('აირჩიეთ მოქმედი ჯგუფი.', 400);
        }
        profileUpdates.group_id = nextGroup;
      } else profileUpdates.group_id = null;
      for (const key of ['name', 'email', 'phone']) {
        if (updates[key] !== undefined) {
          if (updates[key] !== null && typeof updates[key] !== 'string') return jsonError('არასწორი ველის ტიპი.', 400);
          profileUpdates[key] = key === 'phone' ? nullableText(updates[key])
            : typeof updates[key] === 'string' ? updates[key].trim() : null;
        }
      }
      if ('name' in profileUpdates && !profileUpdates.name) return jsonError('სახელი სავალდებულოა.', 400);
      if ('email' in profileUpdates) {
        if (typeof profileUpdates.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileUpdates.email)) return jsonError('არასწორი ელფოსტა.', 400);
        profileUpdates.email = profileUpdates.email.toLowerCase();
      }
      if (typeof profileUpdates.email === 'string' && profileUpdates.email !== existing.email.toLowerCase()) {
        return jsonError('ელფოსტა მომხმარებელმა საკუთარი პროფილიდან უნდა შეცვალოს და წერილით დაადასტუროს.', 400);
      }
      delete profileUpdates.email;
      if (updates.role !== undefined) profileUpdates.role = currentRole;
      // Omitted fields stay unchanged. Explicit null/empty values clear a field.
      if (currentRole === 'TEACHER') {
        if (updates.teaching_subjects !== undefined) {
          const subjects = subjectList(updates.teaching_subjects);
          if (!subjects) return jsonError('დაამატეთ მასწავლებლის მინიმუმ ერთი საგანი (მაქსიმუმ 12).', 400);
          profileUpdates.teaching_subjects = subjects;
        } else if (updates.subject !== undefined) profileUpdates.subject = nullableText(updates.subject);
        profileUpdates.grade = null;
      } else if (currentRole === 'STUDENT') {
        profileUpdates.teaching_subjects = null;
        if (updates.grade !== undefined) profileUpdates.grade = nullableText(updates.grade);
        profileUpdates.subject = null;
      } else {
        profileUpdates.teaching_subjects = null;
        profileUpdates.grade = null;
        profileUpdates.subject = null;
      }
      if (updates.password !== undefined && typeof updates.password !== 'string') return jsonError('არასწორი პაროლი.', 400);
      if (updates.password && updates.password.length < 8) return jsonError('პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს.', 400);

      // Save profile first: validation or uniqueness failures cannot desynchronize Auth.
      let profileQuery = adminClient.from('profiles').update(profileUpdates).eq('id', targetUserId);
      for (const key of Object.keys(profileUpdates)) {
        profileQuery = existing[key] === null ? profileQuery.is(key, null) : profileQuery.eq(key, filterValue(existing[key]));
      }
      const { data: updatedProfile, error: profileError } = await profileQuery.select().single();
      if (profileError) return jsonError(profileError.message, 400);

      const authUpdates: { password?: string } = {};
      if (updates.password) authUpdates.password = updates.password;
      if (Object.keys(authUpdates).length) {
        const { error: authError } = await adminClient.auth.admin.updateUserById(targetUserId, authUpdates);
        if (authError) {
          const rollback: Record<string, unknown> = {};
          for (const key of Object.keys(profileUpdates)) rollback[key] = existing[key];
          let rollbackQuery = adminClient.from('profiles').update(rollback).eq('id', targetUserId);
          for (const key of Object.keys(profileUpdates)) {
            rollbackQuery = profileUpdates[key] === null ? rollbackQuery.is(key, null) : rollbackQuery.eq(key, filterValue(profileUpdates[key]));
          }
          const { data: restoredProfile, error: rollbackError } = await rollbackQuery.select('id').maybeSingle();
          if (rollbackError || !restoredProfile) {
            console.error('Profile rollback failed or a concurrent edit was detected', { targetUserId, error: rollbackError?.message });
            return jsonError('ანგარიშის სინქრონიზაცია ვერ მოხერხდა. საჭიროა ადმინისტრატორის შემოწმება.', 500);
          }
          return jsonError(authError.message, 400);
        }
      }
      return new Response(JSON.stringify({ profile: updatedProfile, success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

      if (targetUserId === callerUser.id) return jsonError('საკუთარი ანგარიშის წაშლა დაუშვებელია.', 400);
      // Preserve academic history until subjects/assignments have been transferred or archived.
      const [subjects, assignments] = await Promise.all([
        adminClient.from('subjects').select('id', { count: 'exact', head: true }).eq('teacher_id', targetUserId),
        adminClient.from('assignments').select('id', { count: 'exact', head: true }).eq('teacher_id', targetUserId),
      ]);
      if (subjects.error || assignments.error) return jsonError('მომხმარებლის კავშირების შემოწმება ვერ მოხერხდა.', 500);
      if (subjects.count || assignments.count) return jsonError('მასწავლებლის წაშლამდე გადააბარეთ მისი საგნები და დავალებები.', 409);
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
