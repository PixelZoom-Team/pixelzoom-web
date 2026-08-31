# PixelZoom Web

픽셀 아트의 고유 블록 크기를 탐지해, 소수점 배율에서도 왜곡 없이 확대·축소하는 웹 서비스.

코어 알고리즘의 수학적 정의와 의사코드는 논문에 있습니다 —
[Applied Sciences, doi:10.3390/app16052314](https://doi.org/10.3390/app16052314).
원본 CLI 구현과 연구 자료는 [Coldlapse/PixelZoom](https://github.com/Coldlapse/PixelZoom)에 있습니다.

## 구조

```
backend/    FastAPI + Mangum, AWS Lambda 컨테이너로 배포
  pixelzoom_core/   논문 알고리즘. 라우터/서비스는 이 모듈을 참조만 한다
  app/              HTTP 계층 (스키마, 라우터, 설정)
  tests/            원본 구현과의 동작 일치 검증 포함
frontend/   React (CRA), S3 + CloudFront로 배포
  pages/            Main(리사이즈) · HowItWorks(원리) · Credits
  i18n/             영어·한국어·일본어·중국어 사전과 경량 Provider
  theme/            디자인 토큰과 픽셀 UI 믹스인
  components/ui/    화면들이 공유하는 조각(버튼, 패널, 액자, 안내)
infra/      Terraform — Lambda·ECR·S3·CloudFront·Route 53·GitHub OIDC
scripts/    E2E · 진단 · 그림 생성 · 로케일 검사
```

## 역할 분담

서버는 **판별·탐지**만, 클라이언트가 **렌더링**을 맡습니다. 브라우저 Canvas의
리사이징이 코어 알고리즘과 동일한 결과를 낸다는 것을 수치 비교로 확인했기
때문입니다. 덕분에 이미지 왕복이 사라져 요청당 응답이 수백 바이트에 머물고,
서버리스 콜드 스타트가 사용자 체감에서 빠집니다. 근거는 저장소 밖의 ADR 문서를
참고하세요.

## 화면

| 경로 | 하는 일 |
| --- | --- |
| `/` | 이미지를 올리고 배율을 골라 내려받습니다. 3단계 폴백이 여기서 갈립니다 |
| `/how-it-works` | 최소 단위 이미지가 무엇이고 왜 그렇게 리사이즈하는지 |
| `/stats` | 누적 처리 기록과 이미지 세 갈래의 비율 |
| `/credits` | 기여자 |

첫 방문이면 안내 팝업이 한 번 뜹니다. `/how-it-works`로 보내는 버튼과 닫는 버튼이
있고, 어느 쪽을 눌러도 다시 뜨지 않습니다. 이 표시는 `localStorage`에 남깁니다 —
서버가 볼 일이 없는 값이라 쿠키로 두면 모든 요청에 실려 나가기만 합니다. 팝업을
거절한 사람을 위해 `/how-it-works`는 상단 바에 항상 있습니다.

**UI 언어는 브라우저 설정을 따라갑니다.** 지원하지 않는 언어면 영어로 떨어집니다.
상단 바에서 바꾸면 그 선택이 `localStorage`에 남아 다음 방문부터는 브라우저 설정보다
우선합니다. 사전은 `frontend/src/i18n/locales/`에 있습니다.

리사이즈 화면에는 배율을 정하는 방법이 둘 있습니다. **슬라이더**는 0~3배를
훑고, 미리보기가 배율에 따라 실제로 커지고 작아집니다(프레임 밖은 잘립니다).
전체를 보고 싶으면 '프레임에 맞추기'로 돌릴 수 있습니다. **직접 입력**은 상한이
캔버스뿐이라 훨씬 큰 배율도 되며, 여기서는 확대 애니메이션 대신 도착 배율과
해상도를 실시간으로 보여줍니다 — 20배를 입력했다고 화면에서 20배로 부풀릴 이유가
없기 때문입니다.

무손실이 가능한 이미지는 어느 쪽에서든 도트당 픽셀 수가 정수가 되도록 스냅되므로
배율이 아무리 커도 무손실입니다. 블록을 못 찾은 이미지는 직접 입력에서 요청한
배율을 그대로 적용하되, 무손실이 아님을 화면에서 분명히 합니다.

푸터에는 저작권 표시(`© 2026 Coldlapse`)와 개인정보 고지, 그리고 누적 처리
기록 한 줄이 있습니다. 고지는
별도 페이지로 빼지 않았습니다 — 계정도 쿠키도 추적도 없는 서비스에서 그 한 줄이
사실의 전부라, 링크를 걸어 페이지를 하나 더 만들면 읽을 것이 있는 것처럼 보이게
만들 뿐입니다. 다만 **고지가 실제 동작과 어긋나면 안 됩니다.** 이미지는 분석을
위해 서버로 한 번 올라가고(ADR-001이 남긴 유일한 왕복), 배포 후에는 접속 로그가
남습니다. 둘 다 밝힌 뒤에야 "수집하지 않는다"가 참이 됩니다.

후원 링크(Buy Me a Coffee)는 상단 바와 푸터에 있습니다. **공식 배너 이미지를 쓰지
않고 직접 그렸습니다** — `cdn.buymeacoffee.com`의 이미지를 걸면 페이지를 여는
것만으로 방문자 IP가 제3자에게 전달되는데, 바로 옆에 개인정보 고지를 적어 놓고
그럴 수는 없습니다. 자체 호스팅이라 요청도 한 번 줄고 픽셀 문법과도 맞습니다.

표제에 쓰는 픽셀 폰트(Press Start 2P)에는 CJK 글리프가 없습니다. 한글·가나·한자는
본문 폰트로 떨어지는데 **공백 문자만 픽셀 폰트에서 와서** 단어 사이가 벌어지므로,
CJK 화면에서는 표제 폰트와 크기를 CSS 변수(`--font-display`, `--display-scale`)로
함께 바꿉니다. 워드마크는 어느 언어에서나 Latin이라 픽셀 폰트를 유지합니다.

## API

`POST /api/analyze` — multipart 필드명 `image`

한 번의 요청으로 '원본 기준'과 '크롭 기준' 탐지 결과를 함께 돌려줍니다.
클라이언트의 3단계 폴백이 왕복을 두 번 하지 않게 하기 위함입니다.

```json
{
  "image": { "width": 16, "height": 16 },
  "asIs": {
    "detected": false,
    "source": { "width": 16, "height": 16 },
    "chunkSize": null, "minchunk": null, "bbox": null
  },
  "cropped": {
    "detected": true,
    "source": { "width": 12, "height": 12 },
    "chunkSize": 3,
    "minchunk": { "width": 4, "height": 4 },
    "bbox": { "x": 2, "y": 2, "width": 12, "height": 12 }
  }
}
```

클라이언트는 이렇게 분기합니다.

1. `asIs.detected` → 원본 그대로 무손실 리사이징
2. `cropped.detected` → 배경을 잘라도 되는지 **사용자에게 묻고**, 수락하면 무손실
3. 둘 다 실패 → 정수 배율 최근접 이웃 확대 (무손실 아님을 명시)

`GET /api/stats` — 누적 처리 기록.

```json
{ "images": 1024, "users": 271, "lossless": 480, "croppable": 300, "unsupported": 244 }
```

**숫자뿐입니다.** 이미지도, 파일명도, 주소도, 식별자도 저장하지 않습니다. 항목
하나에 정수 몇 개가 전부이고 DynamoDB의 원자적 ADD로 올립니다 — 읽고-더하고-쓰면
동시에 뜬 Lambda 인스턴스 사이에서 증가분이 조용히 사라집니다.

`users`는 **이미지를 한 번이라도 올린 브라우저 수**입니다. 브라우저가 '이번이
처음'이라고 알려 줄 때만 1을 더하는데, 그 신호는 참/거짓 한 비트라 서버가 사람을
구분하는 데 쓸 수 없습니다. 대신 저장소를 비우거나 다른 기기로 오면 다시
세어지므로 실제 사람 수와는 다릅니다. 통계 페이지에 그 한계를 적어 두었습니다 —
정확한 척하는 것보다 낫습니다.

응답에는 `Cache-Control: public, max-age=60`이 붙습니다. 푸터가 모든 페이지에서
이 값을 읽기 때문입니다. 통계 화면만 캐시를 건너뛰어 방금 올린 것이 바로
반영되게 합니다.

`STATS_TABLE`이 비어 있으면 프로세스 안 카운터로 떨어집니다. 로컬 개발과
테스트가 AWS 없이 돌아가기 위한 것이며, 배포 환경에서 비어 있다면 설정이 빠진
것입니다.

`GET /api/health` — 배포 직후 스모크 테스트와 모니터링용.

## 로컬 실행

터미널 두 개를 씁니다. 백엔드가 8000, 프론트가 3000이고, 백엔드의 CORS 기본
허용 오리진이 `http://localhost:3000`이라 그대로 맞물립니다.

```bash
# 터미널 1 — 백엔드
cd backend
conda env create -f environment.yml    # 최초 1회
conda activate pixelzoom
uvicorn app.main:app --reload --port 8000

# 터미널 2 — 프론트엔드
cd frontend
cp .env.example .env
npm install
npm start
```

conda는 인터프리터만 만들고 패키지는 pip이 `requirements-dev.txt`에서 넣습니다.
conda 채널의 opencv/numpy 빌드를 쓰면 Lambda 이미지에 들어가는 PyPI 휠과 다른
바이너리로 개발하게 되기 때문입니다. 파이썬 버전도 Lambda base 이미지와 같은
3.13으로 맞춰 두었습니다.

## 테스트

```bash
conda activate pixelzoom
cd backend && pytest -q          # 단위 + HTTP + Lambda 핸들러
node scripts/check-locales.mjs   # 네 언어 사전의 키가 어긋나지 않는지
node scripts/e2e.mjs             # 브라우저 E2E (두 서버가 떠 있어야 함)
```

로케일 검사가 따로 있는 이유는, 빠진 번역이 화면에서 **영어로 조용히
폴백되기 때문**입니다. 사용자에게 빈 화면을 보이지 않으려고 그렇게 했지만 그
대가로 누락이 눈에 띄지 않으므로, 사람 눈 대신 CI에서 셉니다.

`scripts/e2e.mjs`는 Chrome을 헤드리스로 띄워 CDP로 직접 몹니다. Playwright를
설치하지 않으려고 Node 22+의 내장 WebSocket만 씁니다. 3단계 폴백이 각각
나오는지, 크롭을 수락했을 때 원본 알고리즘과 같은 해상도가 나오는지를 확인하고
단계별 스크린샷을 남깁니다.

```
PASS  첫 방문 안내
PASS  언어 전환
PASS  1단계 · 원본 그대로 무손실            [12x12]
PASS  2단계 · 크롭하면 무손실               [580x550]
PASS  2단계 · 크롭해도 무손실 불가          [182x400]
PASS  3단계 · 잘라낼 여백조차 없음          [67x61]
PASS  2단계 수락 · 크롭 후 무손실           [496x465 -> 1488x1395]
PASS  2단계 수락 · 여백만 제거(NN)          [156x148 -> 468x444]
PASS  2단계 거절 · 원본 크기 유지           [182x400 -> 546x1200]
```

E2E는 Chrome을 `--lang=en-US`로 띄웁니다. UI 언어가 브라우저 설정을 따라가는 것은
의도된 동작이라, 고정하지 않으면 검사 결과가 스크립트를 돌리는 사람의 브라우저
설정에 따라 달라집니다.

`SHOT_DIR`로 스크린샷 위치를, `APP_URL`/`API_URL`로 대상 주소를 바꿀 수 있습니다.

## 생성되는 자산

`/how-it-works`의 그림과 파비콘은 손으로 만들지 않습니다.

```bash
python scripts/make_figures.py    # 설명용 그림
python scripts/make_favicon.py    # 파비콘 (public/)
```

코어 저장소의 샘플 이미지(`image/dot/*.png`)는 출처가 불분명한 팬아트가 섞여 있어
공개 배포물에 싣지 않고, 스크립트가 스프라이트를 직접 그립니다. 그리고 그림이
주장하는 블록 크기와 최소 단위를 `pixelzoom_core`에 물어 확인한 뒤에만
저장합니다 — 설명 그림이 알고리즘과 어긋나면 그건 틀린 설명입니다.

측정값(도트 폭 등)은 스크립트가 출력하며, 페이지의 `FIGURE`·`WOBBLE` 상수와 사전
문구에 그대로 옮겨 적습니다. 그림을 다시 만들면 그 값들도 같이 맞춰야 합니다.

**한 절 안의 그림은 모두 같은 배율로 굽습니다.** 화면에서 크기를 견주게 만드는
그림들이라, 배율이 다르면 비교 자체가 거짓이 됩니다. 확대는 PNG에 미리 구워
둡니다 — 브라우저가 반정수 배율로 늘이면 브라우저가 만든 얼룩이 우리가 보여주려는
것과 섞입니다.

블록 크기는 절마다 다릅니다.

- **워블 시연은 블록 2.** 블록이 클수록 워블이 안 보입니다 — 블록 31에 1.4배를
  걸면 도트 폭이 43과 44로 갈리는데 2% 차이라 눈으로는 구분되지 않습니다. 탐지
  가능한 가장 작은 블록(`detect`는 1을 자명해로 보고 빼므로 2가 하한)에 1.25배를
  걸면 3px과 2px로 갈려 50% 차이가 납니다.
- **탐지·최소 단위 설명은 블록 8.** 2단계가 작품과 최소 단위 이미지를 실제 크기
  비율로 나란히 놓기 때문입니다. 블록이 31이면 최소 단위가 1/31로 찍혀 보이지
  않습니다. 8이면 작품 512px 옆에 최소 단위가 64px으로 앉아, 줄어든 정도가
  드러나면서도 형체는 알아볼 수 있습니다.

원본이 실제로 탐지되는지도 스크립트가 확인합니다 — 탐지되지 않는 이미지로
"PixelZoom은 이렇게 한다"를 보여주면 그림이 거짓말을 하게 됩니다.

파비콘은 마스코트를 축소해 만들지 않고 **16×16 격자 위에 따로 그립니다.** 축소는 이
제품이 하지 말라고 말하는 바로 그 일이라, 아이콘에서 그걸 하면 앞뒤가 맞지 않습니다.
32·48·192는 전부 정수배 확대이고, `favicon.ico`는 Pillow 없이 직접 씁니다.

## 배포에 필요한 저장소 설정

GitHub Actions가 OIDC로 AWS에 인증합니다. 장기 액세스 키는 저장하지 않습니다.

| 종류 | 이름 | 용도 |
| --- | --- | --- |
| Secret | `AWS_DEPLOY_ROLE_ARN` | Actions가 assume할 IAM 역할 |
| Variable | `AWS_REGION` | 배포 리전 |
| Variable | `ECR_REPOSITORY` | Lambda 컨테이너 이미지 저장소 |
| Variable | `LAMBDA_FUNCTION_NAME` | 갱신할 함수 이름 |
| Variable | `API_BASE_URL` | Lambda Function URL. 프론트 빌드에 주입된다 |
| Variable | `S3_BUCKET` | 정적 자산 버킷 |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID` | 무효화 대상 배포 |

`infra/`의 Terraform이 이 자원들을 만들고 위 값들을 출력합니다. apply가 끝나면
붙여 넣을 명령이 통째로 나옵니다.

```bash
cd infra
terraform output -raw github_setup
```

**apply는 두 번에 나눠 합니다.** Lambda 컨테이너 함수는 생성 시점에 이미지가
이미 ECR에 있어야 하므로, 리포지토리를 먼저 만들고 부트스트랩 이미지를 밀어
넣은 뒤 나머지를 세웁니다. 절차와 각 결정의 근거는 [`infra/README.md`](infra/README.md)에
있습니다.

배포 후에는 실제 주소로 E2E를 다시 돌릴 수 있습니다.

```bash
APP_URL=https://pixelzoom.app API_URL=$(terraform -chdir=infra output -raw api_base_url) \
  node scripts/e2e.mjs
```
