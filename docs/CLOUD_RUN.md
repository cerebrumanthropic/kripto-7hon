# FastAPI backend-ийг Google Cloud Run дээр байршуулах заавар

Энэ заавар нь амьд датаг (ханш, мэдээ) **цаг бүр цагтаа** шинэчлэх FastAPI серверийг Google Cloud-ийн **үнэгүй түвшинд** байршуулна.
Данс нээх, карт баталгаажуулах, төлбөрийн тохиргоог **та өөрөө** хийнэ (CLAUDE.md дүрэм 9). Үлдсэнийг нэг скрипт хийнэ.

> **Нууц түлхүүр, токеноо Claude Code-ийн чатад хэзээ ч бүү бичээрэй.** CoinGecko түлхүүрийг зөвхөн 5-р алхамд Cloud Shell-д оруулна.

## Юу үүсэх вэ

| Нөөц | Зорилго | Үнэгүй хязгаар (сар бүр) | Манай хэрэглээ (ойролцоогоор) |
|---|---|---|---|
| **Cloud Run** `kripto-api` (us-central1) | Датаг HTTPS-ээр үйлчилнэ, `/admin/refresh` дээр татна | 2 сая хүсэлт, 180,000 vCPU-сек, 360,000 GiB-сек | Цагт 1 татлага × ≈60 сек → ≈43,000 vCPU-сек |
| **Cloud Scheduler** `kripto-live` | Цаг бүрийн :07-д (UTC) `/admin/refresh`-ийг дуудна | 3 ажил | 1 ажил |
| **Cloud Storage** `gs://<төсөл>-kripto-state` | Төлөв (өдрийн түүх, мэдээний архив). Cloud Run-ийн диск унтахад устдаг тул | 5 GB, 5,000 бичих, 50,000 унших үйлдэл (зөвхөн us-central1/east1/west1) | <1 MB, ≈3,600 бичих, ≈7,000 унших |
| **Secret Manager** | CoinGecko түлхүүр, admin токен | 6 идэвхтэй хувилбар, 10,000 хандалт | 2 хувилбар |
| **Cloud Build / Artifact Registry** | `gcloud run deploy --source` image бүтээж хадгална | 2,500 build-минут / 0.5 GB | Deploy бүрд ≈3 мин / ≈150 MB |

Instance хүсэлтгүй үед унтдаг (min 0). Цагийн ажлыг Cloud Scheduler сэрээнэ. Сайт руу орсон хүн унтсан instance-ийг сэрээвэл эхний хариу 2–4 сек удаж болно. Энэ хооронд сайт build үеийн датаг харуулна.

---

## 1. Google Cloud-д нэвтрэх

1. https://console.cloud.google.com руу орно.
2. Google дансаараа нэвтэрнэ.
3. Анх орж байгаа бол улсаа сонгоод **Terms of Service**-ийг зөвшөөрнө.

## 2. Төлбөрийн данс (карт баталгаажуулалт)

Cloud Run үнэгүй түвшинд ч **идэвхтэй төлбөрийн данс** шаарддаг. Үнэгүй хязгаараас хэтрээгүй бол төлбөр гарахгүй.

1. https://console.cloud.google.com/freetrial руу орно.
2. **Start free** → картын мэдээллээ оруулна. Шинэ данс бол 90 хоногийн $300 кредит авна.
3. **Анхаар:** 90 хоног дуусахад Google дансыг идэвхжүүлэх эсэхийг асууна.
   - Сервер үргэлжлэн ажиллахын тулд **Activate full account / Upgrade** дарах хэрэгтэй.
   - Үүний дараа ч үнэгүй түвшин хүчинтэй хэвээр. Зөвхөн хязгаараас хэтэрсэн хэсэгт төлбөр гарна.
   - Идэвхжүүлэхгүй бол сервер зогсоно.

## 3. Төсөл үүсгэх

1. https://console.cloud.google.com/projectcreate руу орно.
2. **Project name**: `kripto-7hon` → **Create**.
3. Доор харагдах **Project ID**-г тэмдэглээд аваарай (жишээ нь `kripto-7hon-482913`). 5-р алхамд хэрэгтэй.
4. Хуудасны дээд хэсгийн төслийн сонголтод шинэ төсөл сонгогдсон эсэхийг шалгана.

## 4. Зардлын сэрэмжлүүлэг (санал болгож байна)

1. https://console.cloud.google.com/billing/budgets → **Create budget**.
2. **Amount**: `1` (USD) → сэрэмжлүүлгийн босго 50%, 90%, 100% → **Finish**.

Хязгаараас хэтэрвэл имэйл ирнэ. Сэрэмжлүүлэг нь зардлыг автоматаар зогсоодоггүй.

## 5. Cloud Shell-ээс скрипт ажиллуулах

1. Консолын баруун дээд буланд **>_** (Activate Cloud Shell) товчийг дарна. Эсвэл https://shell.cloud.google.com руу орно.
   - «Authorize Cloud Shell» гэж асуувал **Authorize** дарна.
2. Доорх командуудыг **нэг нэгээр нь** хуулж ажиллуулна. `<ТАНЫ-PROJECT-ID>`-ийг 3-р алхмын ID-гаар солино:

```bash
git clone -b fastapi-backend https://github.com/cerebrumanthropic/kripto-7hon.git
```

```bash
cd kripto-7hon
```

```bash
PROJECT_ID=<ТАНЫ-PROJECT-ID> bash backend/deploy/cloudrun.sh
```

3. Скрипт хоёр зүйл асууна:
   - **CoinGecko Demo API түлхүүр**: GitHub Secrets-д хадгалсантай ижил `CG-...` түлхүүрийг наана. Бичсэн нь харагдахгүй, энэ хэвийн. Enter дарна.
   - **Холбоо барих имэйл**: GitHub-ийн `CONTACT_EMAIL`-д бичсэн имэйлээ оруулна.
4. 5–10 минут хүлээнэ. Төгсгөлд `Бэлэн. Сервисийн хаяг: https://kripto-api-xxxxx-uc.a.run.app` гэж гарна.

Скрипт дараах зүйлсийг хийнэ:
- Хэрэгтэй API-уудыг идэвхжүүлнэ.
- Bucket, service account (зөвхөн тэр bucket-д бичих эрхтэй), нууцуудыг үүсгэнэ.
- Cloud Run-д байршуулна.
- Цагийн ажлыг тохируулаад анхны татлагыг эхлүүлнэ.
- Анхны татлага өмнөх өдрийн түүх ба мэдээний архивыг одоогийн GitHub Pages-ээс нэг удаа уншиж bucket-д хадгална.

## 6. Шалгах

1–2 минутын дараа хөтчөөр нээнэ (`<URL>`-ийг скриптийн хэвлэсэн хаягаар солино):

- `<URL>/healthz`: `"ok": true`, `"stateBucket": true`, `"lastExitCode": 0` байх ёстой.
- `<URL>/live/market.json`: JSON харагдана.
- https://console.cloud.google.com/cloudscheduler: `kripto-live` ажлын **Last run** нь «Success» байх ёстой.

## 7. Надад мэдэгдэх

Сервисийн **хаягийг** (URL) Claude Code-д бичнэ үү. Энэ нь нууц биш. Би дараах зүйлсийг шалгаж, тантай тохиролцоод хийнэ:

- Дата ба цагийн ажлыг хэдэн цаг ажиллуулж шалгана.
- GitHub-ийн `DATA_BASE_URL` хувьсагчийг энэ хаяг руу шилжүүлэх. Энэ алхмыг та Settings-ээс хийнэ.
- GitHub Actions-ийн `live-data` ажлыг унтраах.
- `fastapi-backend` branch-ийг `main` руу нэгтгэх.

Шилжүүлэх хүртэл сайт GitHub Pages-ээс уншсаар байна. Cloud Run зэрэгцэн ажиллавал аль алинд нь хор хөнөөлгүй.

---

## Код өөрчлөгдсөний дараа дахин байршуулах

Cloud Shell-д:

```bash
cd ~/kripto-7hon && git pull && PROJECT_ID=<ТАНЫ-PROJECT-ID> bash backend/deploy/cloudrun.sh
```

Аль хэдийн байгаа bucket, нууцыг алгасна. Түлхүүрийг дахин асуухгүй.

## Асуудал гарвал

| Шинж тэмдэг | Шийдэл |
|---|---|
| `Billing account ... not found` / `requires billing` | 2-р алхам. Төслөө https://console.cloud.google.com/billing/linkedaccount-д төлбөрийн данстай холбоно |
| `PROJECT_ID=... гэж төслийн ID-гаа зааж өгнө үү` | Командын эхэнд `PROJECT_ID=...`-ийг мартсан |
| `/healthz` дээр `"lastExitCode": 1` | Бүх зах зээлийн эх сурвалж унасан. Cloud Run → `kripto-api` → **Logs**-ийг шалгана |
| Scheduler дээр 401 | Токен солигдсон. Скриптийг дахин ажиллуулна (Scheduler-ийн токеныг шинэчилнэ) |
| CoinGecko түлхүүр буруу | Secret Manager → `coingecko-demo-key` → **New version** → зөв түлхүүр. Дараа нь скриптийг дахин ажиллуулна |
| Artifact Registry 0.5 GB-аас хэтэрсэн | https://console.cloud.google.com/artifacts → `cloud-run-source-deploy` → хуучин image-уудыг устгана |
| Бүгдийг устгах | https://console.cloud.google.com/iam-admin/projects → төслийг **Shut down**. Бүх нөөц ба төлбөр зогсоно |
