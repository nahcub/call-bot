# AI Agent 전화 발신 시스템

ElevenLabs ConvAI API와 Twilio를 연동하여 AI 에이전트가 자동으로 전화를 걸 수 있는 웹 애플리케이션입니다.

## 🚀 빠른 시작

### 1. 환경 설정

백엔드 디렉토리에 `.env` 파일을 생성하고 다음 환경변수들을 설정하세요:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key
AGENT_ID=your_agent_id
AGENT_PHONE_NUMBER_ID=your_phone_number_id
TO_NUMBER=your_target_phone_number
```

### 2. 백엔드 실행

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

### 4. 사용하기

브라우저에서 `http://localhost:5173`에 접속하여 "전화 걸기" 버튼을 클릭하세요.

## 📁 프로젝트 구조

```
my-agent-server/
├── backend/              # FastAPI 백엔드
│   ├── main.py          # 메인 서버 코드
│   ├── requirements.txt # Python 의존성
│   └── .env            # 환경변수 (생성 필요)
└── frontend/            # React 프론트엔드
    ├── src/
    │   ├── App.jsx
    │   ├── CallButton.jsx
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

## 🔧 API 엔드포인트

- **POST /call**: AI 에이전트를 통한 전화 발신
  - 요청: `{"to_number": "전화번호"}` (선택사항)
  - 응답: 발신 요청 결과

## 🛠️ 기술 스택

- **백엔드**: FastAPI, ElevenLabs ConvAI API, Twilio
- **프론트엔드**: React, Vite
- **통신**: REST API

## ⚠️ 주의사항

1. ElevenLabs API 키와 에이전트 설정이 필요합니다
2. Twilio 계정과 전화번호 설정이 필요합니다
3. 실제 전화 발신에는 요금이 발생할 수 있습니다

## 🔍 문제 해결

### 백엔드 서버가 시작되지 않는 경우
- Python 가상환경을 활성화하세요
- 의존성을 다시 설치하세요: `pip install -r requirements.txt`

### 프론트엔드가 시작되지 않는 경우
- Node.js가 설치되어 있는지 확인하세요
- 의존성을 다시 설치하세요: `npm install`

### CORS 오류가 발생하는 경우
- 백엔드의 CORS 설정을 확인하세요
- 프론트엔드 주소가 올바르게 설정되어 있는지 확인하세요 