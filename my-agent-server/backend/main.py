from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv
import openai

# .env 파일 로드
load_dotenv()

app = FastAPI()

# CORS 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#ElevenLabs 설정 (.env에서 가져오기)
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
AGENT_ID = os.getenv("AGENT_ID")
PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID")

# OpenAI 설정
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = OPENAI_API_KEY

class CallPayload(BaseModel):
    to_number: str
    system_prompt: str
    fields: dict  # 필드 정보 추가

class ChatPayload(BaseModel):
    message: str
    conversation_history: list

@app.post("/chat")
async def chat_with_gpt(payload: ChatPayload):
    try:
        # 시스템 프롬프트 설정
        system_prompt = """You are a helpful assistant that helps users fill out information for making phone calls. 
        Your role is to ask questions one by one to gather the necessary information.
        Be friendly and helpful. Keep responses concise and clear."""
        
        # 대화 히스토리 구성
        messages = [{"role": "system", "content": system_prompt}]
        
        # 사용자 메시지 추가
        for msg in payload.conversation_history:
            if msg["role"] == "user":
                messages.append({"role": "user", "content": msg["text"]})
            elif msg["role"] == "assistant":
                messages.append({"role": "assistant", "content": msg["text"]})
        
        # 현재 사용자 메시지 추가
        messages.append({"role": "user", "content": payload.message})
        
        # OpenAI API 호출
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=150,
            temperature=0.7
        )
        
        # 응답 추출
        assistant_response = response.choices[0].message.content
        
        return {
            "ok": True,
            "response": assistant_response
        }
        
    except Exception as e:
        print(f"ChatGPT API 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/call")
def call_with_agent(payload: CallPayload):
    url = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call"
    headers = {"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"}
    
    # dynamic_variables에 모든 필드 정보 추가
    dynamic_vars = {
        "NAME": payload.fields.get("name", "default name"),
        "CALLBACK_NUMBER": payload.fields.get("callbackNumber", "default callback number"),
        "SPECIAL_REQUESTS": payload.fields.get("specialRequests", "default notes"),
        "PURPOSE": payload.fields.get("purpose", "default purpose"),
        "QUERY": payload.fields.get("query", "default query"),
        "TIME": payload.fields.get("time", "default time"),
        "PEOPLE": str(payload.fields.get("people", "default people")),
        "BUSINESS_NUMBER": payload.fields.get("businessNumber", "default business number")
    }
    
    data = {
        "agent_id": AGENT_ID,
        "agent_phone_number_id": PHONE_NUMBER_ID,
        "to_number": payload.to_number,
        "conversation_initiation_client_data": {
            "type": "conversation_initiation_client_data",
            "dynamic_variables": dynamic_vars
        }
    }
    
    try:
        resp = requests.post(url, headers=headers, json=data, timeout=30)
        
        if not resp.ok:
            raise HTTPException(
                status_code=502,
                detail={"status": resp.status_code, "body": resp.text}
            )
        body = resp.json()
        
        return {
            "ok": True,
            "call_id": body.get("callSid") or body.get("conversation_id"),
            "response": body
        }
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=str(e))
