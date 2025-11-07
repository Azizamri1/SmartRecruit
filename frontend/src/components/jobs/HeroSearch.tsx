import { useState, useEffect } from 'react';

export default function HeroSearch({ defaultQuery, onSubmit }:{
  defaultQuery?: string; onSubmit:(q:string)=>void;
}) {
  const [displayText, setDisplayText] = useState('');
  const fullText = 'Trouvez le job qui vous correspond';

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setDisplayText(fullText.slice(0, i + 1) + '|');
        i++;
      } else {
        setDisplayText(fullText);
        clearInterval(interval);
      }
    }, 100); // 100ms delay per character

    return () => clearInterval(interval);
  }, []);

  return (
    <section
      className="relative flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #9a48ba66, #079a31d9)",
        height: "180px",
        padding: "10px 10px",
        borderRadius: "10px"
      }}
    >
      <div style={{ width:"100%" }}>
        <div style={{ maxWidth: 720, margin:"0 auto", textAlign:"center" }}>
          <h1 style={{ color:"#fff", fontWeight:800, fontSize: "32px", marginBottom: 24 }}>
            {displayText}
          </h1>
          <form
            onSubmit={(e)=>{ e.preventDefault(); const q=(new FormData(e.currentTarget).get('q') as string)||""; onSubmit(q); }}
            style={{ display:"flex", gap: 8, width: "100%", justifyContent:"center" }}
          >
            <input
              name="q"
              defaultValue={defaultQuery}
              placeholder="Les jobs en télétravail vous intéressent?"
              style={{
                width:"100%", maxWidth: 640, padding:"14px 20px", borderRadius: 999,
                border:"none", fontSize:14, boxShadow:"0 4px 6px rgba(0,0,0,.1)"
              }}
            />
            <button
              type="submit"
              aria-label="Rechercher"
              style={{
                width:48, height:48, borderRadius:"50%", background:"#1F2937",
                color:"#fff", border:"none", cursor:"pointer", display:"grid", placeItems:"center"
              }}
            >🔎</button>
          </form>
        </div>
      </div>
    </section>
  );
}

