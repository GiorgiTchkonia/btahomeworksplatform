export const MIN_PASSWORD_LENGTH = 8;

/** Keep provider/database diagnostics in logs, with Georgian feedback in the UI. */
export function localizeError(error: unknown, fallback = 'ოპერაცია ვერ შესრულდა. გთხოვთ სცადოთ ხელახლა.'): string {
  const value = typeof error === 'string' ? { message: error } : error && typeof error === 'object' ? error as { message?: string; code?: string; status?: number } : {};
  const message = typeof value.message === 'string' ? value.message : '';
  const text = `${value.code || ''} ${message}`.toLowerCase();
  if (/same_password|new password should be different/.test(text)) return 'ახალი პაროლი უნდა განსხვავდებოდეს ძველისგან.';
  if (/weak_password|password.*(?:at least|minimum|too short|characters)/.test(text)) return 'პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს.';
  if (/invalid_credentials|invalid login credentials/.test(text)) return 'ელფოსტა ან პაროლი არასწორია. სცადეთ ხელახლა.';
  if (/email_not_confirmed|email not confirmed/.test(text)) return 'შესვლამდე დაადასტურეთ ელფოსტა მიღებული ბმულით.';
  if (/reauthentication|reauthenticate/.test(text)) return 'უსაფრთხოებისთვის ხელახლა გაიარეთ ავტორიზაცია და გაიმეორეთ ცვლილება.';
  if (/refresh_token|session_not_found|jwt expired|invalid token|not authenticated/.test(text)) return 'სესიას ვადა გაუვიდა. გთხოვთ ხელახლა შეხვიდეთ სისტემაში.';
  if (value.status===429 || /rate.limit|too many requests/.test(text)) return 'მოთხოვნები ძალიან ხშირია. ცოტა ხანში სცადეთ ხელახლა.';
  if (/user_already_exists|email_exists|already registered|already been registered/.test(text)) return 'ამ ელფოსტით მომხმარებელი უკვე არსებობს.';
  if (/email_address_invalid|invalid email|email.*invalid/.test(text)) return 'მიუთითეთ სწორი ელფოსტის მისამართი.';
  if (/sending.*email|smtp|email_address_not_authorized/.test(text)) return 'წერილის გაგზავნა ვერ მოხერხდა. სცადეთ მოგვიანებით ან დაუკავშირდით ადმინისტრატორს.';
  if (/23505|duplicate key|unique constraint/.test(text)) return 'ასეთი მონაცემებით ჩანაწერი უკვე არსებობს. გადაამოწმეთ შეყვანილი ინფორმაცია.';
  if (/23503|foreign key/.test(text)) return 'ჩანაწერი სხვა მონაცემებთან არის დაკავშირებული. ჯერ გადაამოწმეთ მისი კავშირები.';
  if (/42501|row.level security|permission denied|forbidden|unauthorized|access required/.test(text)) return 'ამ მოქმედებისთვის საჭირო წვდომა არ გაქვთ.';
  if (/failed to fetch|fetch failed|network|timeout|timed out/.test(text)) return 'სერვერთან კავშირი ვერ დამყარდა. შეამოწმეთ ინტერნეტი და სცადეთ ხელახლა.';
  if (/[\u10A0-\u10FF\u1C90-\u1CBF]/.test(message)) {
    const withoutBrands=message.replace(/Google|Drive|Docs|PDF|Word|MIME|PowerPoint|Excel|BTA|URL|HTTPS|ZIP|RAR|JPEG|PNG|WEBP|DOCX|PPTX|XLSX/gi,'');
    if (!/[a-z]{3,}/i.test(withoutBrands)) return message;
  }
  return fallback;
}
