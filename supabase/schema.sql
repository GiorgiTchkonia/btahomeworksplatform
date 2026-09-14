-- Custom Types
CREATE TYPE user_role AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- Profiles Table (tied to auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  grade TEXT,
  subject TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Subjects Table
CREATE TABLE subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE
);

-- Assignments Table
CREATE TABLE assignments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Submissions Table
CREATE TABLE submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size TEXT,
  student_comment TEXT,
  status TEXT DEFAULT 'SUBMITTED',
  teacher_feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Row Level Security (RLS) Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read their own profile. Admins can read all.
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
-- Allow everyone to read teacher names for assignments (if needed, expand this later)
CREATE POLICY "Anyone can view teacher profiles" ON profiles FOR SELECT USING (role = 'TEACHER');
CREATE POLICY "Teachers can view their students" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'TEACHER')
);

-- Subjects: Everyone can read subjects
CREATE POLICY "Subjects are viewable by everyone" ON subjects FOR SELECT USING (true);

-- Assignments: Everyone can read assignments, teachers can create/update their own
CREATE POLICY "Assignments are viewable by everyone" ON assignments FOR SELECT USING (true);
CREATE POLICY "Teachers can manage their own assignments" ON assignments FOR ALL USING (
  auth.uid() = teacher_id
);

-- Submissions: Students manage their own, Teachers can read/update submissions to their assignments
CREATE POLICY "Students can view their own submissions" ON submissions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can create their own submissions" ON submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teachers can view and update submissions for their assignments" ON submissions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM assignments 
    WHERE assignments.id = submissions.assignment_id 
    AND assignments.teacher_id = auth.uid()
  )
);
