-- MIGRATION SCRIPT
-- Paste this into the Supabase SQL Editor AFTER running schema.sql

-- Migrate Users to auth.users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) 
VALUES ('998d1400-1f99-45a6-9003-07573eaff7a5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@academy.ge', '$2b$12$KJklfw9ELkABetLFP3LbcO6.YadN1V4RRudb.R.o9OPtC2GQ9dQHK', now(), now(), now(), '', '', '', '') ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) 
VALUES ('4d5a2875-b575-43e4-81d7-8223c505e959', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nino.gelashvili@academy.ge', '$2b$10$1AzWNra1Qo0CZuQk1laI7upocoijjYvW8cT2cVE/jHvr3jpqX7Ts2', now(), now(), now(), '', '', '', '') ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) 
VALUES ('e7786f31-2c3c-4189-9118-36f54cf7397e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'giorgi.kavtaradze@academy.ge', '$2b$10$cVDNFwBdaXg3Vtb7mKecouMuM03NlIXnPtfjU4Qdn9eYWjjHzwMv6', now(), now(), now(), '', '', '', '') ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) 
VALUES ('2dce3c5d-ea4d-4d84-ac5f-31848055df2e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tamar.chkheidze@academy.ge', '$2b$10$MOvDS7TDK.G9FqesvBp78umP/92.NnWoyPAvM8brTVwBdYKdl8/QK', now(), now(), now(), '', '', '', '') ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) 
VALUES ('39e97196-60ff-42a3-b425-e1b8acc96528', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'davit.lomidze@academy.ge', '$2b$10$zS1sIm6TIvKWJSESRGSvQeGDv41K46P5bBb9fw8N5AxmPJ122dOry', now(), now(), now(), '', '', '', '') ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) 
VALUES ('4e20cbbe-609f-4306-8f44-f8119c9a0090', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'luka.beridze@academy.ge', '$2b$10$fHp5qTt35TGCA21s.NEFzeiONF1iqRYrQRux4fSKxGN8T7E8rogwC', now(), now(), now(), '', '', '', '') ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) 
VALUES ('1eb1643f-bb26-4b9b-aec9-23d9e1e66f08', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mariam.kapanadze@academy.ge', '$2b$10$aY2LMjnfbTfm95VNF43ZO.Gpham38NE6jB9xtOch081HSrb.nrvpS', now(), now(), now(), '', '', '', '') ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) 
VALUES ('00b509cb-70a4-43f7-8948-6a16ba2c18ce', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nikoloz.maisuradze@academy.ge', '$2b$10$/I1tUIH8s5eIg/QZywWF0.vSglQExdhSF./kUYV77JaIiNS/hVIsq', now(), now(), now(), '', '', '', '') ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) 
VALUES ('5bffef9b-c4e7-434f-9748-44ba7068fc21', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anano.japaridze@academy.ge', '$2b$10$2T2fIQ4cz1ZgLvnuZaj2Ee9gP/PXqDjwWXTJv9iPmeary5XCbipwy', now(), now(), now(), '', '', '', '') ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) 
VALUES ('111eac89-78e3-4518-a6cc-cf3d8cc2a926', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'giorgi.chkonia@academy.ge', '$2b$10$pxq6ncEjur3q0aVxcAwZ..PTmCU2YH9lBKqPgqYBJbeAy9mbJQo8G', now(), now(), now(), '', '', '', '') ON CONFLICT (id) DO NOTHING;

-- Migrate Profiles
INSERT INTO profiles (id, role, name, email, grade, subject, phone) 
VALUES ('998d1400-1f99-45a6-9003-07573eaff7a5', 'ADMIN', 'მთავარი ადმინისტრატორი', 'admin@academy.ge', NULL, NULL, NULL);
INSERT INTO profiles (id, role, name, email, grade, subject, phone) 
VALUES ('4d5a2875-b575-43e4-81d7-8223c505e959', 'TEACHER', 'ნინო გელაშვილი', 'nino.gelashvili@academy.ge', NULL, 'მათემატიკა', '+995 599 11 22 33');
INSERT INTO profiles (id, role, name, email, grade, subject, phone) 
VALUES ('e7786f31-2c3c-4189-9118-36f54cf7397e', 'TEACHER', 'გიორგი ქავთარაძე', 'giorgi.kavtaradze@academy.ge', NULL, 'ფიზიკა', '+995 599 22 33 44');
INSERT INTO profiles (id, role, name, email, grade, subject, phone) 
VALUES ('2dce3c5d-ea4d-4d84-ac5f-31848055df2e', 'TEACHER', 'თამარ ჩხეიძე', 'tamar.chkheidze@academy.ge', NULL, 'ქართული ენა და ლიტერატურა', '+995 599 33 44 55');
INSERT INTO profiles (id, role, name, email, grade, subject, phone) 
VALUES ('39e97196-60ff-42a3-b425-e1b8acc96528', 'TEACHER', 'დავით ლომიძე', 'davit.lomidze@academy.ge', NULL, 'ინგლისური ენა', '+995 599 44 55 66');
INSERT INTO profiles (id, role, name, email, grade, subject, phone) 
VALUES ('4e20cbbe-609f-4306-8f44-f8119c9a0090', 'STUDENT', 'ლუკა ბერიძე', 'luka.beridze@academy.ge', 'X კლასი', NULL, NULL);
INSERT INTO profiles (id, role, name, email, grade, subject, phone) 
VALUES ('1eb1643f-bb26-4b9b-aec9-23d9e1e66f08', 'STUDENT', 'მარიამ კაპანაძე', 'mariam.kapanadze@academy.ge', 'X კლასი', NULL, NULL);
INSERT INTO profiles (id, role, name, email, grade, subject, phone) 
VALUES ('00b509cb-70a4-43f7-8948-6a16ba2c18ce', 'STUDENT', 'ნიკოლოზ მაისურაძე', 'nikoloz.maisuradze@academy.ge', 'X კლასი', NULL, NULL);
INSERT INTO profiles (id, role, name, email, grade, subject, phone) 
VALUES ('5bffef9b-c4e7-434f-9748-44ba7068fc21', 'STUDENT', 'ანანო ჯაფარიძე', 'anano.japaridze@academy.ge', 'X კლასი', NULL, NULL);
INSERT INTO profiles (id, role, name, email, grade, subject, phone) 
VALUES ('111eac89-78e3-4518-a6cc-cf3d8cc2a926', 'STUDENT', 'გიორგი ჭყონია', 'giorgi.chkonia@academy.ge', 'X კლასი', NULL, NULL);

-- Migrate Subjects
INSERT INTO subjects (id, name, color, icon, teacher_id) 
VALUES ('sub-math', 'მათემატიკა', 'indigo', 'Calculator', '4d5a2875-b575-43e4-81d7-8223c505e959');
INSERT INTO subjects (id, name, color, icon, teacher_id) 
VALUES ('sub-physics', 'ფიზიკა', 'emerald', 'Atom', 'e7786f31-2c3c-4189-9118-36f54cf7397e');
INSERT INTO subjects (id, name, color, icon, teacher_id) 
VALUES ('sub-geo', 'ქართული ენა', 'amber', 'BookOpen', '2dce3c5d-ea4d-4d84-ac5f-31848055df2e');
INSERT INTO subjects (id, name, color, icon, teacher_id) 
VALUES ('sub-eng', 'ინგლისური ენა', 'rose', 'Languages', '39e97196-60ff-42a3-b425-e1b8acc96528');

-- Migrate Assignments
INSERT INTO assignments (id, subject_id, teacher_id, title, description, due_date, attachment_url, attachment_name, created_at) 
VALUES ('asg-1789335010570-c3280dba', 'sub-geo', '2dce3c5d-ea4d-4d84-ac5f-31848055df2e', 'გელა', 'ბლბაბლალბა', '2026-09-25T23:59', '/uploads/1789335009550_i14-251_front_end_______________________________________________________________________________1___1___27_.xlsx', 'i14-251 front end ááááááááááá¢á ááá¢ááá áá ááá£áá (1) (1) (27).xlsx', '2026-09-13T21:30:10.570Z');
INSERT INTO assignments (id, subject_id, teacher_id, title, description, due_date, attachment_url, attachment_name, created_at) 
VALUES ('asg-1789206142353', 'sub-math', '4d5a2875-b575-43e4-81d7-8223c505e959', 'კომპლექსური დავალება N5', 'ტრიგონომეტრია და გელა ბარკალაია', '2026-09-12T12:00', '/uploads/1789206141262_i14-251_front_end_______________________________________________________________________________1___1___27_.xlsx', 'i14-251 front end ááááááááááá¢á ááá¢ááá áá ááá£áá (1) (1) (27).xlsx', '2026-09-12T09:42:22.353Z');
INSERT INTO assignments (id, subject_id, teacher_id, title, description, due_date, attachment_url, attachment_name, created_at) 
VALUES ('asg-1', 'sub-math', '4d5a2875-b575-43e4-81d7-8223c505e959', 'კვადრატული განტოლებები და დისკრიმინანტი', 'გთხოვთ ამოხსნათ სახელმძღვანელოს 84-ე გვერდზე მოცემული სავარჯიშოები N1-დან N10-ის ჩათვლით. ამოხსნის ნაბიჯები დაწერეთ გარკვევით რვეულში და ატვირთეთ ფოტოსურათი ან PDF.', '2026-09-20T23:59', '', '', '2026-09-10T10:00:00.000Z');
INSERT INTO assignments (id, subject_id, teacher_id, title, description, due_date, attachment_url, attachment_name, created_at) 
VALUES ('asg-2', 'sub-math', '4d5a2875-b575-43e4-81d7-8223c505e959', 'ვიეტის თეორემა და ამოცანები', 'სახელმძღვანელოდან გვერდი 92, ამოცანები N5, N8, N12. შეამოწმეთ ფესვების ჯამი და ნამრავლი.', '2026-09-25T23:59', '', '', '2026-09-11T12:00:00.000Z');
INSERT INTO assignments (id, subject_id, teacher_id, title, description, due_date, attachment_url, attachment_name, created_at) 
VALUES ('asg-3', 'sub-physics', 'e7786f31-2c3c-4189-9118-36f54cf7397e', 'ნიუტონის მეორე კანონი და ძალთა ბალანსი', 'შეასრულეთ პრაქტიკული სამუშაო N3. გამოთვალეთ აჩქარება და სხეულზე მოქმედი ტოლქმედი ძალა მოცემული მონაცემების მიხედვით.', '2026-09-18T20:00', '', '', '2026-09-08T09:00:00.000Z');
INSERT INTO assignments (id, subject_id, teacher_id, title, description, due_date, attachment_url, attachment_name, created_at) 
VALUES ('asg-4', 'sub-geo', '2dce3c5d-ea4d-4d84-ac5f-31848055df2e', 'ესე: ''ვეფხისტყაოსნის'' მეგობრობის იდეალი', 'დაწერეთ მცირე ესე (მინიმუმ 250 სიტყვა) ავთანდილისა და ტარიელის მეგობრობის შესახებ. განიხილეთ მოყვასისათვის თავგანწირვის მოტივი.', '2026-09-22T23:59', '', '', '2026-09-09T14:30:00.000Z');
INSERT INTO assignments (id, subject_id, teacher_id, title, description, due_date, attachment_url, attachment_name, created_at) 
VALUES ('asg-5', 'sub-eng', '39e97196-60ff-42a3-b425-e1b8acc96528', 'Present Perfect vs Past Simple Essay & Exercises', 'Complete unit 4 review exercises (pages 34-35). Write 5 complex sentences showing the distinction between indefinite past and finished time.', '2026-09-21T18:00', '', '', '2026-09-10T16:00:00.000Z');

-- Migrate Submissions
INSERT INTO submissions (id, assignment_id, student_id, student_name, file_url, file_name, file_size, student_comment, status, teacher_feedback, submitted_at, reviewed_at) 
VALUES ('subm-1', 'asg-1', '4e20cbbe-609f-4306-8f44-f8119c9a0090', 'ლუკა ბერიძე', '/uploads/1789146201313_chrome_elf.dll', 'chrome_elf.dll', '2.6 MB', 'მასწავლებელო, მე-8 სავარჯიშოში ორივე მეთოდით ამოვხსენი.', 'APPROVED', 'დავალება მიღებულია და დადასტურებულია ✅', '2026-09-11T17:03:23.428Z', '2026-09-11T17:05:11.928Z');
INSERT INTO submissions (id, assignment_id, student_id, student_name, file_url, file_name, file_size, student_comment, status, teacher_feedback, submitted_at, reviewed_at) 
VALUES ('subm-2', 'asg-1', '1eb1643f-bb26-4b9b-aec9-23d9e1e66f08', 'მარიამ კაპანაძე', '/demo-homework.svg', 'mariam_kapanadze_hw1.jpg', '2.1 MB', 'ჩავაბარე დროულად.', 'APPROVED', 'დავალება მიღებულია და დადასტურებულია ✅', '2026-09-11T15:10:00.000Z', '2026-09-11T17:05:17.102Z');
INSERT INTO submissions (id, assignment_id, student_id, student_name, file_url, file_name, file_size, student_comment, status, teacher_feedback, submitted_at, reviewed_at) 
VALUES ('subm-3', 'asg-1', '00b509cb-70a4-43f7-8948-6a16ba2c18ce', 'ნიკოლოზ მაისურაძე', '/demo-work.jpg', 'nikoloz_math.png', '850 KB', 'მე-9 ნომერი გამიჭირდა ცოტა.', 'APPROVED', 'დავალება მიღებულია და დადასტურებულია ✅', '2026-09-11T11:00:00.000Z', '2026-09-11T17:05:22.210Z');
INSERT INTO submissions (id, assignment_id, student_id, student_name, file_url, file_name, file_size, student_comment, status, teacher_feedback, submitted_at, reviewed_at) 
VALUES ('subm-4', 'asg-3', '4e20cbbe-609f-4306-8f44-f8119c9a0090', 'ლუკა ბერიძე', '/demo-work.jpg', 'luka_physics_lab3.pdf', '1.2 MB', 'ნიუტონის კანონების გაანგარიშება.', 'APPROVED', 'დავალება მიღებულია და დადასტურებულია ✅', '2026-09-09T18:00:00.000Z', '2026-09-13T21:19:03.961Z');
