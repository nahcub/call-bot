import { useState, useEffect } from "react";

export default function CallButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [orderContent, setOrderContent] = useState("");

  // 채팅 관련 상태
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hello! I\'ll ask you for the necessary information one by one. First, what is your purpose? (e.g., reservation or inquiry)' }
  ]);
  const [chatInput, setChatInput] = useState("");
  
  // 필드 상태
  const [fields, setFields] = useState({
    purpose: '',
    query: '',
    time: '',
    people: '',
    name: '',           // 추가
    specialRequests: '', // 추가
    callbackNumber: '',
    businessNumber: ''
  });

  const validators = {
    purpose: (v) => ['reservation', 'inquiry'].includes(v),
    query:   (v) => !!v?.trim(),
    time:    (v) => !!v?.trim(),          // keep as string (human-friendly); you can also validate ISO below
    people:  (v) => Number(v) >= 1 && Number(v) <= 50,
    callbackNumber: (v) => !!(v || '').replace(/[^\d+]/g, '').match(/^\+?\d{7,}$/),
    businessNumber: (v) => !!(v || '').replace(/[^\d+]/g, '').match(/^\+?\d{7,}$/)
  };
  
  // import at top of your file
// import * as chrono from 'chrono-node';

function normalizePhone(raw, defaultCountry = 'US') {
  if (!raw) return '';
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  // naive E.164-ish: US default
  if (defaultCountry === 'US' && /^\d{10}$/.test(digits)) return '+1' + digits;
  return digits; // fallback (still passes your validator >=7 digits)
}

function parseTimeEnglish(text) {
  try {
    // Primary: chrono-node (handles "tomorrow 7 pm", "Fri 19:30", "in 2 hours")
    const results = chrono.parse(text, new Date());
    if (results?.length) {
      const best = results[0];
      const dt = best.date(); // JS Date
      // Return human + ISO so you can show or store either one
      return {
        display: best.text.trim(),
        iso: dt.toISOString()
      };
    }
  } catch (_) {}
  // Fallback regex for simple times like "7pm" / "19:30"
  const m = text.match(/\b((1[0-2]|0?[1-9])\s*(:\s*\d{2})?\s*(am|pm))\b|\b([01]?\d|2[0-3]):\d{2}\b/i);
  if (m) return { display: m[0].trim(), iso: '' };
  return null;
}

function parsePeople(text) {
  // "for 4", "party of 3", "3 people", "table for 2"
  const m = text.match(/\b(?:for|of)?\s*(\d{1,2})\s*(?:people|persons|guests|pax|party|table)?\b/i);
  return m ? parseInt(m[1], 10) : null;
}

function parsePurpose(text) {
  const t = text.toLowerCase();
  if (/(reserve|reservation|book|booking|table)/.test(t)) return 'reservation';
  if (/(ask|inquire|question|availability|info|information|check)/.test(t)) return 'inquiry';
  return undefined;
}

function parseQuery(text) {
  const t = text.toLowerCase();

  // Expandable cuisine/category map
  const map = {
    chicken: 'fried chicken restaurant',
    'fried chicken': 'fried chicken restaurant',
    pizza: 'pizzeria',
    sushi: 'sushi restaurant',
    ramen: 'ramen shop',
    steak: 'steakhouse',
    korean: 'korean restaurant',
    japanese: 'japanese restaurant',
    chinese: 'chinese restaurant',
    italian: 'italian restaurant',
    mexican: 'mexican restaurant',
    bbq: 'bbq restaurant',
    cafe: 'cafe',
    brunch: 'brunch place',
  };

  for (const k of Object.keys(map)) {
    if (t.includes(k)) return map[k];
  }

  // Generic intents like “restaurant”, “place to eat”
  if (/(restaurant|place to eat|diner|eatery)/.test(t)) return 'restaurant';
  return undefined;
}

function parsePhones(text) {
  const phones = (text.match(/(\+?\d[\d\-\s()]{6,})/g) || []).map(p => p.trim());

  // Try to classify using nearby keywords
  let callback = '';
  let business = '';
  phones.forEach(p => {
    const idx = text.indexOf(p);
    const window = text.slice(Math.max(0, idx - 25), Math.min(text.length, idx + p.length + 25)).toLowerCase();
    const n = normalizePhone(p);

    if (/(my|me|call\s?back|callback|reach me|personal)/.test(window) && !callback) callback = n;
    else if (/(restaurant|business|store|place|shop)/.test(window) && !business) business = n;
    else if (!business) business = n; // default first to business
    else if (!callback) callback = n;
  });

  return { callbackNumber: callback, businessNumber: business };
}

function parseIntoFields(text) {
  const upd = {};

  // Purpose
  const purpose = parsePurpose(text);
  if (purpose) upd.purpose = purpose;

  // Query / category
  const q = parseQuery(text);
  if (q) upd.query = q;

  // Time
  const t = parseTimeEnglish(text);
  if (t) {
    // store a friendly string; keep ISO separately if you want to send to backend
    upd.time = t.display; 
    upd.timeISO = t.iso;   // optional extra field
  }

  // People
  const ppl = parsePeople(text);
  if (ppl !== null) upd.people = ppl;

  // Phones
  const { callbackNumber, businessNumber } = parsePhones(text);
  if (callbackNumber) upd.callbackNumber = callbackNumber;
  if (businessNumber) upd.businessNumber = businessNumber;

  return upd;
}


  

  // 채팅 전송
  const sendChat = async () => {
    const content = chatInput.trim();
    if (!content) return;

    setChatMessages(prev => [...prev, { role: 'user', text: content }]);
    setChatInput('');

    const parsed = parseIntoFields(content);
    
    setFields(prev => {
      const nxt = { ...prev };
      if (parsed.purpose) nxt.purpose = parsed.purpose;
      if (parsed.query) nxt.query = parsed.query;
      if (parsed.time) nxt.time = parsed.time;
      if (parsed.people != null) { const n = Number(parsed.people); if (!isNaN(n)) nxt.people = n; }
      if (parsed.callbackNumber) { 
        nxt.callbackNumber = parsed.callbackNumber; 
        setPhoneNumber(parsed.callbackNumber);
      }
      if (parsed.businessNumber) nxt.businessNumber = parsed.businessNumber;
      return nxt;
    });

    // ChatGPT API 호출
    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          conversation_history: chatMessages
        })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantResponse = data.response;
        
        setChatMessages(prev => [...prev, { role: 'assistant', text: assistantResponse }]);
        
        // orderContent 자동 구성
        setTimeout(() => {
          const f = { ...fields, ...parsed };
          const contentTpl =
            `[PURPOSE=${f.purpose || ''}]\n` +
            `QUERY=${f.query || ''}\n` +
            `TIME=${f.time || ''} | PEOPLE=${f.people || ''}\n` +
            `CALLBACK=${f.callbackNumber || ''} | BUSINESS=${f.businessNumber || ''}`;
          setOrderContent(contentTpl);
        }, 100);
      }
    } catch (error) {
      console.error('ChatGPT API 오류:', error);
    }
  };

  const handleCall = async () => {
    if (!fields.businessNumber.trim()) {
      setMsg("Please provide business phone number");
      return;
    }

    try {
      setLoading(true);
      setMsg("Requesting call...");

      const res = await fetch("http://localhost:8000/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          to_number: fields.businessNumber,
          system_prompt: orderContent,
          // 필드 정보 추가
          fields: {
            purpose: fields.purpose,
            query: fields.query,
            time: fields.time,
            people: fields.people,
            name: fields.name,
            specialRequests: fields.specialRequests,
            callbackNumber: fields.callbackNumber,
            businessNumber: fields.businessNumber
          }
        })
      });

      const data = await res.json();
      if (res.ok && data?.ok !== false) {
        setMsg("Call request completed!");
        console.log("Result:", data);
      } else {
        setMsg("Call failed");
        console.error("Error response:", data);
      }
    } catch (err) {
      setMsg("Network error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 채팅 영역 */}
      <div style={{ marginBottom: 24, border: "1px solid #ddd", borderRadius: 8, height: "600px", display: "flex", flexDirection: "column" }}>
        {/* 메시지 리스트 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px", backgroundColor: "#f9f9f9" }}>
          {chatMessages.map((message, index) => (
            <div
              key={index}
              style={{
                marginBottom: "8px",
                textAlign: message.role === "user" ? "right" : "left"
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  backgroundColor: message.role === "user" ? "#007bff" : "#e9ecef",
                  color: message.role === "user" ? "white" : "black",
                  maxWidth: "70%",
                  wordBreak: "break-word"
                }}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>
        
        {/* 채팅 입력창 */}
        <div style={{ padding: "12px", borderTop: "1px solid #ddd", display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendChat()}
            placeholder="Type your message here..."
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: "14px"
            }}
          />
          <button
            onClick={sendChat}
            disabled={!chatInput.trim()}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              backgroundColor: chatInput.trim() ? "#007bff" : "#ccc",
              color: "white",
              cursor: chatInput.trim() ? "pointer" : "not-allowed",
              fontSize: "14px"
            }}
          >
            Send
          </button>
        </div>
      </div>
      
      {/* 전화 버튼 */}
      <button
        onClick={handleCall}
        disabled={loading}
        style={{
          padding: "10px 16px",
          borderRadius: 12,
          border: "1px solid #ccc",
          cursor: loading ? "not-allowed" : "pointer",
          backgroundColor: loading ? "#f5f5f5" : "#28a745",
          color: loading ? "#999" : "white",
          width: "100%",
          fontSize: "16px",
          fontWeight: "bold",
          boxShadow: "0 4px 8px rgba(40, 167, 69, 0.3)",
          transition: "all 0.3s ease"
        }}
      >
        {loading ? "Making call..." : "🚀 Make Call"}
      </button>
      
      {/* 결과 메시지 */}
      {msg && (
        <div style={{ 
          marginTop: 12, 
          padding: "8px 12px", 
          borderRadius: 6,
          backgroundColor: msg.includes("failed") || msg.includes("error") ? "#ffebee" : "#e8f5e8",
          color: msg.includes("failed") || msg.includes("error") ? "#c62828" : "#2e7d32"
        }}>
          {msg}
        </div>
      )}
    </div>
  );
}
