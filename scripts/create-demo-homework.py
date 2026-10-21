from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import simpleSplit

OUT = Path('output/pdf/demo-homework')
OUT.mkdir(parents=True, exist_ok=True)
FONT = r'C:/Users/Giorgi/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/share/fonts/DejaVuSans.ttf'
pdfmetrics.registerFont(TTFont('Georgian', FONT))
samples = {
 'mathematics-demo.pdf': ('მათემატიკა', 'კვადრატული განტოლებები', [
  'სატესტო ამოხსნების ნიმუში',
  '1. x² - 5x + 6 = 0. დისკრიმინანტი: 25 - 24 = 1. ფესვები: x = 2 და x = 3.',
  '2. 2x² - 7x + 3 = 0. დისკრიმინანტი: 49 - 24 = 25. ფესვები: x = 3 და x = 0.5.',
  '3. x² + 4x + 4 = 0. ფორმულა: (x + 2)² = 0. ორმაგი ფესვი: x = -2.',
  '4. x² + 1 = 0. ნამდვილ რიცხვებში ამონახსნი არ არსებობს.',
  'მართკუთხედის ამოცანა: x(x + 3) = 40. x² + 3x - 40 = 0. დადებითი ამონახსნია x = 5; გვერდებია 5 და 8.'
 ]),
 'georgian-demo.pdf': ('ქართული ენა', 'ალუდა ქეთელაური - პიროვნება და თემი', [
  'სატესტო ლიტერატურული მსჯელობის ნიმუში',
  'ვაჟა-ფშაველას პოემაში ალუდა ადამიანის ღირსებას ტრადიციული მტრობის საზღვრებს მიღმა ხედავს. მოწინააღმდეგის სიმამაცის აღიარება მისთვის საკუთარი ზნეობრივი არჩევანის დასაწყისია.',
  'პიროვნებისა და თემის დაპირისპირება განსხვავებულ ღირებულებებს წარმოაჩენს: ერთ მხარეს დგას დამკვიდრებული წესის დაცვის მოთხოვნა, მეორე მხარეს კი ადამიანის პატივისცემაზე დაფუძნებული შინაგანი რწმენა.',
  'ალუდას არჩევანი მარტივი პროტესტი არ არის. იგი ცდილობს ერთგული დარჩეს სინდისის ხმისა მაშინაც, როდესაც ამას საზოგადოებრივი გარიყვა მოსდევს.',
  'დასკვნა: ნაწარმოები გვაფიქრებს, შეიძლება თუ არა ტრადიციის გადახედვა ადამიანის ღირსების სახელით. ეს მოკლე ტექსტი მხოლოდ ინტერფეისის სატესტო ნიმუშია და სრულ სასწავლო ესეს არ წარმოადგენს.'
 ]),
 'english-demo.pdf': ('ინგლისური ენა', 'აწმყო სრული და წარსული მარტივი დროები', [
  'სატესტო გრამატიკული პასუხების ნიმუში',
  '1. I visited my grandparents yesterday.',
  '2. She has already finished her homework.',
  '3. We went to the museum last Saturday.',
  '4. They have never travelled abroad.',
  '5. He lost his keys two days ago.',
  '6. Have you ever read this book?',
  'განმარტება: დასრულებული წარსული დროის მაჩვენებლებია yesterday, last Saturday და two days ago. გამოცდილებისა და აწმყოსთან დაკავშირებული შედეგისთვის გამოყენებულია აწმყო სრული დრო.'
 ]),
 'social-video-demo.pdf': ('სოციალური ქსელის ვიდეო', 'კოლეჯის ყოველდღიურობის სცენარი', [
  'სატესტო სცენარის ნიმუში',
  'მიზანი: კოლეჯში სასწავლო დღის მოკლე, გასაგები წარდგენა. აუდიტორია: მომავალი სტუდენტები. ხანგრძლივობა: 45 წამი.',
  '0-5 წამი: კოლეჯის საერთო სივრცე. შესავალი: „ერთი სასწავლო დღე ჩვენს კოლეჯში“.',
  '5-20 წამი: სასწავლო მასალისა და პრაქტიკული სამუშაოს ჩვენება, მონაწილეთა პირადი მონაცემების გამოჩენის გარეშე.',
  '20-35 წამი: ჯგუფური პროექტის დეტალები. ეკრანზე მოკლე ტექსტი: „ვსწავლობთ და ვქმნით ერთად“.',
  '35-45 წამი: შესრულებული სამუშაოს შედეგი და დასკვნა: „შენი პროფესიული გზა აქ იწყება“.',
  'კადრების გეგმა და ტექსტი შექმნილია მხოლოდ საიტის დემონსტრაციისთვის. რეალური ვიდეო ამ ფაილს არ ახლავს.'
 ])
}
for filename, (subject, title, paragraphs) in samples.items():
    doc = canvas.Canvas(str(OUT / filename), pagesize=(595,842))
    doc.setTitle(f'სატესტო ნამუშევარი - {subject}')
    doc.setFillColor(HexColor('#eef2ff')); doc.roundRect(36,740,523,66,12,fill=1,stroke=0)
    doc.setFillColor(HexColor('#4338ca')); doc.setFont('Georgian',14)
    doc.drawString(52,778,'სატესტო ნამუშევარი - დემონსტრაცია')
    doc.setFont('Georgian',10); doc.drawString(52,757,f'I14-25/1 | {subject}')
    y = 710
    doc.setFillColor(HexColor('#0f172a')); doc.setFont('Georgian',14)
    for line in simpleSplit(title,'Georgian',14,490): doc.drawString(48,y,line); y-=23
    y-=12
    doc.setFont('Georgian',10)
    for paragraph in paragraphs:
        for line in simpleSplit(paragraph,'Georgian',10,490):
            if y<100: raise ValueError(f'Content too long: {filename}')
            doc.drawString(48,y,line); y-=18
        y-=11
    doc.setFillColor(HexColor('#64748b')); doc.setFont('Georgian',8)
    doc.drawString(48,63,'შექმნილია საიტის ტესტირებისთვის. ეს არ არის სტუდენტის რეალური ნაშრომი.')
    doc.drawRightString(547,43,'1 / 1')
    doc.save()
    print(filename)
