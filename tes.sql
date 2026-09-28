-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  max_sessions integer DEFAULT 12,
  price numeric DEFAULT 0,
  max_capacity integer DEFAULT 20,
  category text NOT NULL DEFAULT 'anak-anak'::text,
  schedule_info jsonb DEFAULT '{"days": [], "end_time": "", "start_time": ""}'::jsonb,
  CONSTRAINT classes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.coaches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  phone_number character varying,
  specialty character varying,
  qr_token character varying NOT NULL UNIQUE,
  nickname character varying,
  role_title character varying,
  experience_desc text,
  age integer,
  nationality character varying DEFAULT 'Indonesia'::character varying,
  achievements jsonb DEFAULT '[]'::jsonb,
  photo_url text,
  show_on_landing boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT coaches_pkey PRIMARY KEY (id),
  CONSTRAINT coaches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  nis character varying NOT NULL UNIQUE,
  qr_token character varying NOT NULL UNIQUE,
  parent_name character varying,
  age integer,
  address text,
  phone_number character varying,
  created_at timestamp with time zone DEFAULT now(),
  avatar_url text,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  session_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  class_ids jsonb DEFAULT '[]'::jsonb,
  coach_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.attendance_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid,
  student_id uuid,
  coach_id uuid,
  status character varying NOT NULL CHECK (status::text = ANY (ARRAY['hadir_qr'::character varying, 'hadir_manual'::character varying, 'izin'::character varying, 'sakit'::character varying, 'alpa'::character varying]::text[])),
  scanned_at timestamp with time zone DEFAULT now(),
  enrollment_id uuid,
  CONSTRAINT attendance_logs_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT attendance_logs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT attendance_logs_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.coaches(id),
  CONSTRAINT attendance_logs_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.student_enrollments(id)
);
CREATE TABLE public.landing_courses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  price character varying NOT NULL,
  description text,
  features jsonb DEFAULT '[]'::jsonb,
  icon_name character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  category text NOT NULL DEFAULT 'anak-anak'::text,
  CONSTRAINT landing_courses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.landing_gallery (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  image_url text NOT NULL,
  alt_text character varying,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT landing_gallery_pkey PRIMARY KEY (id)
);
CREATE TABLE public.landing_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  section character varying NOT NULL UNIQUE,
  title character varying,
  subtitle text,
  action_url character varying,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT landing_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.landing_testimonials (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  role character varying,
  text text NOT NULL,
  is_published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT landing_testimonials_pkey PRIMARY KEY (id)
);
CREATE TABLE public.faqs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT faqs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.student_enrollments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::text, 'completed'::text, 'dropped'::text])),
  enrolled_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT student_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT student_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT student_enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  amount numeric NOT NULL,
  receipt_url text NOT NULL,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  reject_reason text,
  processed_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  sender_name text,
  sender_bank text,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id),
  CONSTRAINT payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT payments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  full_name character varying NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['admin'::character varying, 'student'::character varying, 'coach'::character varying]::text[])),
  status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'active'::character varying, 'rejected'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  target_audience text NOT NULL DEFAULT 'all'::text,
  urgency text NOT NULL DEFAULT 'normal'::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (id)
);


-- 1. Tambah durasi estimasi belajar pada kelas (hari atau bulan)
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS estimated_duration_value integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS estimated_duration_unit character varying DEFAULT 'bulan' 
CHECK (estimated_duration_unit IN ('hari', 'bulan'));

-- 2. Tambah catatan penutupan dan status 'expired' pada pendaftaran atlet
ALTER TABLE public.student_enrollments 
DROP CONSTRAINT IF EXISTS student_enrollments_status_check;

ALTER TABLE public.student_enrollments 
ADD CONSTRAINT student_enrollments_status_check 
CHECK (status IN ('active', 'completed', 'dropped', 'expired'));

ALTER TABLE public.student_enrollments 
ADD COLUMN IF NOT EXISTS completion_notes text;