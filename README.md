# BTA Homeworks — საშინაო დავალებების პორტალი

> ბიზნესისა და ტექნოლოგიების აკადემიის (BTA) საშინაო დავალებების მართვის, ჩაბარებისა და შეფასების ერთიანი თანამედროვე პლატფორმა.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%7C%20DB%20%7C%20Storage-3ecf8e.svg)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Tests-141%2F141%20Passing-brightgreen.svg)]()

---

## 📋 სარჩევი (Table of Contents)
1. [პროექტის მიმოხილვა (Overview)](#-პროექტის-მიმოხილვა-overview)
2. [ტექნოლოგიური სტეკი (Tech Stack)](#-ტექნოლოგიური-სტეკი-tech-stack)
3. [არქიტექტურა და როლები (Architecture & Roles)](#-არქიტექტურა-და-როლები-architecture--roles)
4. [უსაფრთხოების მოდელი (Security Posture)](#-უსაფრთხოების-მოდელი-security-posture)
5. [გარემოს ცვლადები (Environment Variables)](#-გარემოს-ცვლადები-environment-variables)
6. [მონაცემთა ბაზა და მიგრაციები (Database & Migrations)](#-მონაცემთა-ბაზა-და-მიგრაციები-database--migrations)
7. [ინსტალაცია და გაშვება (Getting Started)](#-ინსტალაცია-და-გაშვება-getting-started)
8. [ტესტირება და ხარისხის კონტროლი (Testing & QA)](#-ტესტირება-და-ხარისხის-კონტროლი-testing--qa)
9. [ოპტიმიზაცია და Performance (Performance & Optimization)](#-ოპტიმიზაცია-და-performance-performance--optimization)
10. [დეპლოი (Deployment)](#-დეპლოი-deployment)

---

## 🎯 პროექტის მიმოხილვა (Overview)

**BTA Homeworks** შექმნილია სასწავლო პროცესის სრული ციფრული ტრანსფორმაციისთვის. პლატფორმა აერთიანებს სტუდენტებს, პედაგოგებსა და ადმინისტრაციას ერთ ეკოსისტემაში, უზრუნველყოფს საშინაო დავალებების ჩაბარებას, შეფასებას, ანალიტიკასა და მომხმარებელთა მართვას მაქსიმალური უსაფრთხოებისა და აკადემიური ეთიკის სტანდარტების დაცვით.

---

## 🛠️ ტექნოლოგიური სტეკი (Tech Stack)

### Frontend
- **React 18.3** — კომპონენტური UI არქიტექტურა
- **TypeScript 5.5** — მკაცრი ტიპიზაცია (`strict: true`, zero `any`)
- **Vite 5.4** — მაღალსიჩქარიანი ასამბლერი და HMR
- **Tailwind CSS 3.4** — დიზაინ-სისტემა სრული Dark Mode მხარდაჭერით
- **Wouter** — ულტრამსუბუქი მარშრუტიზაცია როლებზე დაფუძნებული `<ProtectedRoute>` დაცვით
- **Lucide React** — თანამედროვე ვექტორული იკონოგრაფია

### Backend & Cloud
- **Supabase PostgreSQL** — რელაციური ბაზა Row-Level Security (RLS) პოლიტიკებით
- **Supabase Auth** — JWT სესიები, დაცული ავთენტიფიკაცია და პაროლის აღდგენის ნაკადი
- **Supabase Storage** — დაცული ფაილური საცავი Signed URL-ებით
- **Supabase Edge Functions (Deno)** — ადმინისტრაციული პრივილეგირებული ფუნქციები (`admin-users`)
- **Vercel** — Production ჰოსტინგი Enterprise HTTP უსაფრთხოების ჰედერებით

---

## 👥 არქიტექტურა და როლები (Architecture & Roles)

### 1. მოსწავლე (Student)
- საგნების მიხედვით პროგრესის დინამიკური თვალყურის დევნება (დასრულებული, მოლოდინში, გასასწორებელი).
- დავალებების ჩაბარება ფაილის ატვირთვით (PDF, DOCX, XLSX, PPTX, WebP/JPG/PNG, ZIP, RAR) ან Google Drive/Docs დამოწმებული ბმულით.
- ჩაბარებული ნაშრომის რედაქტირება/გაუქმება ვადის ამოწურვამდე (ძველი ფაილების ავტომატური წაშლით).
- მასწავლებლის შეფასების (ქულა 1–10) და დეტალური კომენტარების ნახვა.

### 2. მასწავლებელი (Teacher)
- საგნებისა და დავალებების სრული მართვა (შექმნა, რედაქტირება, წაშლა).
- დაშვებული ფაილის ფორმატების (`allowedFormats`) და ვადების (`dueDate`) დაწესება.
- სტუდენტთა ნაშრომების რეესტრი: ძებნა სტუდენტის სახელით და ფილტრაცია სტატუსების მიხედვით (`ALL`, `SUBMITTED`, `APPROVED`, `DECLINED`, `UNSUBMITTED`).
- ნაშრომის შემოწმება: დამტკიცება (`APPROVED`) ან ცვლილებების მოთხოვნა (`DECLINED`), 1–10 ქულიანი შეფასება და პერსონალური რეცენზია.

### 3. ადმინისტრატორი (Admin)
- მომხმარებელთა თეთრი სიის (Whitelist) სრული მართვა.
- მომხმარებლების შექმნა, რედაქტირება და წაშლა Supabase Edge Function-ის მეშვეობით.
- როლების (`STUDENT`, `TEACHER`, `ADMIN`), კლასების/ჯგუფებისა და საგნების მინიჭება.

### 4. საჯარო და სამართლებრივი გვერდები
- **დოკუმენტაცია (`/`)** — პლატფორმის შესაძლებლობების ინტერაქტიული გაცნობა.
- **კონფიდენციალურობის პოლიტიკა (`/privacy`)** — საქართველოს „პერსონალურ მონაცემთა დაცვის შესახებ" კანონთან სრულად შესაბამისი დოკუმენტი.
- **გამოყენების წესები (`/terms`)** — აკადემიური კეთილსინდისიერების, პლაგიატის აკრძალვისა და მომხმარებელთა უფლება-მოვალეობების რეგლამენტი.

---

## 🔐 უსაფრთხოების მოდელი (Security Posture)

1. **Row-Level Security (RLS):**
   - ყველა ცხრილზე (`profiles`, `assignments`, `subjects`, `submissions`) ჩართულია RLS.
   - ანონიმურ მომხმარებელს არ აქვს წვდომა პროფილებზე, დავალებებსა და ჩაბარებებზე.
   - პედაგოგებს აქვთ მხოლოდ `SELECT` და `UPDATE (status, teacher_feedback, grade, reviewed_at)` უფლება შესაბამის საგნებში.

2. **მონაცემთა ბაზის ტრიგერები (Anti-Privilege Escalation):**
   - `BEFORE UPDATE ON profiles` ტრიგერი კრძალავს `role`-ის ან `email`-ის შეცვლას თვითნებურად მომხმარებლის მიერ (ხელმისაწვდომია მხოლოდ ADMIN როლისთვის).
   - `BEFORE INSERT/UPDATE ON submissions` ტრიგერი უზრუნველყოფს, რომ სტუდენტის მიერ ჩაბარებისას სტატუსი ყოველთვის იყოს `SUBMITTED`, `grade` და `teacher_feedback` იყოს `NULL`, სტუდენტის სახელი ამოიკითხოს ბაზიდან და ვადაგასული დავალება არ მიიღოს სერვერმა.

3. **Service Role Key იზოლაცია:**
   - კლიენტურ აპლიკაციაში არ გამოიყენება Service Role Key.
   - ადმინისტრაციული ქმედებები დელეგირებულია Supabase Edge Function-ზე (`supabase/functions/admin-users`), რომელიც ამოწმებს გამომძახებლის JWT ტოკენსა და `ADMIN` როლს.

4. **ფაილების საცავის დაცვა (Storage Isolation):**
   - Bucket არის `private`. ფაილების სანახავად გენერირდება დროებითი დაცული Signed URL (`createSignedUrl`, 1 საათიანი ვალიდურობით).
   - ფაილები ინახება სტრუქტურით `{studentId}/{uuid}.{ext}`.
   - რეალიზებულია გაფართოებისა და რეალური MIME ტიპის ორმაგი ვალიდაცია (იკრძალება `.exe`, `.sh`, `.py`, `.bat`, `.js` და ა.შ.).
   - ჩაბარების გაუქმებისას ან ხელახალი ატვირთვისას ძველი ფაილი ავტომატურად იშლება საცავიდან.

5. **Stored XSS პრევენცია:**
   - ბმულის ველში იკრძალება `javascript:` და არასანდო პროტოკოლები.
   - მოწმდება `protocol === 'https:'` და ჰოსტნეიმის ზუსტი შესაბამისობა (`drive.google.com`, `docs.google.com`) როგორც კლიენტზე, ისე ბაზის `CHECK` შეზღუდვით.

6. **HTTP Security Headers (`vercel.json`):**
   - `Content-Security-Policy` (CSP)
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy`

---

## ⚙️ გარემოს ცვლადები (Environment Variables)

პროექტის ძირში შექმენით `.env` ფაილი შემდეგი ცვლადებით:

```env
# Supabase პროექტის URL
VITE_SUPABASE_URL=https://your-project.supabase.co

# Supabase საჯარო Anon Key (უსაფრთხოა ბრაუზერისთვის)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# (სურვილისამებრ - მხოლოდ ლოკალური დეველოპმენტისთვის Edge Function-ის გარეშე)
# არასოდეს დააკომიტოთ და არ დაამატოთ Vercel Production გარემოში!
# VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🗄️ მონაცემთა ბაზა და მიგრაციები (Database & Migrations)

მიგრაციის SQL სკრიპტები განთავსებულია საქაღალდეში `supabase/migrations/`:
- `supabase/migrations/20261011000000_consolidated_schema.sql` — სრული კონსოლიდირებული სქემა, RLS პოლიტიკები, ინდექსები (`submissions(student_id)`, `assignments(subject_id)`, `assignments(teacher_id)`) და ტრიგერები.

მიგრაციების გასაშვებად გამოიყენეთ Supabase CLI:
```bash
supabase db push
```
ან ჩასვით SQL სკრიპტი თქვენი Supabase Dashboard-ის SQL Editor-ში.

Edge Function-ის დეპლოისთვის:
```bash
supabase functions deploy admin-users
```

---

## 🚀 ინსტალაცია და გაშვება (Getting Started)

### წინაპირობები
- Node.js >= 18.x
- npm >= 9.x

### 1. რეპოზიტორიის კლონირება და დამოკიდებულებების დაყენება
```bash
git clone https://github.com/your-username/btahomeworks.git
cd btahomeworks
npm install
```

### 2. დეველოპმენტ სერვერის გაშვება
```bash
npm run dev
```
აპლიკაცია გაეშვება მისამართზე: `http://localhost:5173/`

### 3. Production ბილდი
```bash
npm run build
```
ბილდის შედეგი განთავსდება `dist/` საქაღალდეში.

---

## 🧪 ტესტირება და ხარისხის კონტროლი (Testing & QA)

პროექტი აღჭურვილია 4-დონიანი (Tier 1–4) ავტომატიზებული ტესტირების სისტემით, რომელიც მოიცავს 23 სატესტო ნაკრებსა და 141 დამოუკიდებელ ტესტს:

- **Tier 1 (Feature Coverage):** ფუნქციონალის ვალიდაცია (Edge Function, RLS, XSS, ფაილების ვალიდაცია, პაროლის აღდგენა, თემები, სამართლებრივი გვერდები, მასწავლებლის შეფასება და რედაქტირება).
- **Tier 2 (Boundary & Corner Cases):** სასაზღვრო შემთხვევები (ფაილის ზომები, არასწორი ბმულები, ვადის ამოწურვა, 1–10 ქულის დიაპაზონი, CSS კონტრასტი).
- **Tier 3 (Cross-Feature Combinations):** მრავალკომპონენტიანი ურთიერთქმედება (RLS + ტრიგერები, ატვირთვა + ფაილის წაშლის სასიცოცხლო ციკლი).
- **Tier 4 (Real-World Scenarios):** მომხმარებელთა როლების E2E ნაკადები (სტუდენტის, მასწავლებლისა და ადმინისტრატორის სრული სცენარები, შეღწევადობისა და ჰაკერული შეტევების სიმულაცია).

### ტესტების გაშვება:
```bash
# სრული ავტომატიზებული სატესტო ნაკრების გაშვება (141/141 ტესტი)
node tests/run-all.cjs

# TypeScript ტიპების შემოწმება (Zero errors)
npx tsc --noEmit
```

---

## ⚡ ოპტიმიზაცია და Performance (Performance & Optimization)

1. **Route-Level Code Splitting:**
   - ყველა გვერდი (`LoginPage`, `StudentDashboardPage`, `TeacherDashboardPage`, `AdminDashboardPage`, `WhitelistPage`, `DocumentationPage`, `PrivacyPolicyPage`, `TermsPage`) იმპორტირებულია `React.lazy()`-ით.
   - საწყისი JavaScript ჩანქი შემცირებულია 678KB-დან ~440KB-მდე, რაც უზრუნველყოფს მყისიერ პირველად ჩატვირთვას.
   - გვერდების გადასვლაზე რეალიზებულია თანამედროვე Skeleton ანიმაცია (`<Suspense>`).

2. **დინამიური ბიბლიოთეკების იმპორტი:**
   - სურათების კომპრესიის ბიბლიოთეკა `browser-image-compression` (~53KB) ჩაიტვირთება მხოლოდ სურათის ატვირთვის პროცესში დინამიური `import()`-ით.

3. **მონაცემთა მოთხოვნების პარალელიზაცია:**
   - API ფუნქციებში (`getStudentDashboardData`, `getTeacherDashboardData`, `getAssignmentDetails`) თანმიმდევრული მოთხოვნები გაერთიანებულია `Promise.all()`-ში, რაც გამორიცხავს Waterfall შეყოვნებებს.

4. **ფონტებისა და რენდერის ოპტიმიზაცია:**
   - `Noto Sans Georgian` და `DM Sans` ფონტები იტვირთება პირდაპირ `index.html`-დან Google Fonts Preconnect-ით.
   - CSS-დან ამოღებულია ბლოკირებადი `@import` დირექტივები.
   - FOUC (Flash of Unstyled Content) თემის გადართვისას სრულად აღმოფხვრილია `<head>`-ში განთავსებული სინქრონული ინლაინ სკრიპტით.

---

## 🌐 დეპლოი (Deployment)

პროექტი ოპტიმიზებულია Vercel პლატფორმაზე გასაშვებად:
1. შეაერთეთ Git რეპოზიტორია Vercel-თან.
2. მიუთითეთ Framework Preset: `Vite`.
3. დააკონფიგურირეთ Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. დეპლოი ავტომატურად გააქტიურებს `vercel.json`-ში გაწერილ უსაფრთხოების ჰედერებსა და SPA Rewrite წესებს.

---

## 📄 ლიცენზია და საავტორო უფლებები
© 2026 ბიზნესისა და ტექნოლოგიების აკადემია (BTA). ყველა უფლება დაცულია.
