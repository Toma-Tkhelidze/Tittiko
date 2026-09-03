# ტიტიკო (Tittiko)

პერსონალიზებული საბავშვო წიგნებისა და ანიმაციების საიტი. სტატიკური
frontend — GitHub Pages-ზეა განთავსებული; შეკვეთისა და გადახდის ლოგიკა
ცალკე Cloudflare Worker-ზე მუშაობს.

- **ცოცხალი საიტი:** https://toma-tkhelidze.github.io/Tittiko/
- **Worker:** https://shy-sound-1c56.txelidze-toma.workers.dev

## სტრუქტურა

```
.
├── index.html            მთავარი გვერდი
├── books.html            წიგნების კატალოგი
├── book.html             ერთი წიგნის გვერდი
├── animations.html       ანიმაციების კატალოგი
├── animation.html        ერთი ანიმაციის გვერდი
├── order.html            შეკვეთის ფორმა (ვიზარდი)
├── terms.html            წესები და პირობები
├── privacy.html          კონფიდენციალურობის პოლიტიკა
├── delivery.html         მიწოდება და დაბრუნება
│
├── assets/
│   ├── css/style.css     მთელი საიტის სტილი
│   ├── js/script.js      მთელი საიტის ლოგიკა (კატალოგი, ვიზარდი, ვალიდაცია)
│   └── img/              სურათები (ლოგო — დანარჩენი გრაფიკა CSS-ითაა დახატული)
│
├── server/
│   ├── worker.js         აქტიური Cloudflare Worker — გადახდა + Telegram
│   └── legacy/
│       └── telegram-worker.js   ჩანაცვლებული ვერსია (გადახდის გარეშე)
│
└── .claude/launch.json   ლოკალური სტატიკური სერვერის კონფიგი
```

`server/`-ის ფაილები საიტთან ერთად **არ** იტვირთება — GitHub Pages მათ არ
ემსახურება. კოდი ხელით ან Wrangler-ით იტვირთება პირდაპირ Cloudflare
Workers-ის დეშბორდზე. განთავსების სრული ინსტრუქცია `server/worker.js`-ის
თავშია.

## ლოკალურად გაშვება

ნებისმიერი სტატიკური სერვერი საკმარისია, რადგან საიტი მთლიანად
frontend-ია:

```bash
python -m http.server 5178
```

და გახსენი `http://localhost:5178`.

## დეპლოი

- **საიტი** — `main`-ზე push ავტომატურად აქვეყნებს GitHub Pages-ზე.
- **Worker** — ცვლილება `server/worker.js`-ში ხელით უნდა აისახოს
  Cloudflare-ის დეშბორდზეც (Edit code → ჩასვა → Deploy).

## ქეშის განახლება

`assets/css/style.css` და `assets/js/script.js` იტვირთება `?v=N`
პარამეტრით (ყველა HTML გვერდზე). GitHub Pages ფაილებს 10 წუთით ქეშავს,
ამიტომ **ცვლილების შემდეგ ეს ნომერი უნდა გაიზარდოს** ყველა გვერდზე,
თორემ ვიზიტორები ძველ ვერსიას ხედავენ.
