import { useEffect, useMemo, useState } from "react";
import { hasGlyph } from "../data/kana";
import {
  evaluateTrace,
  traceFeedback,
  type TraceGuideStroke,
} from "../domain/traceEvaluation";
import type { Point } from "../domain/input";
import { sampleGlyphGuide } from "../features/practice/sampleGlyphGuide";
import { WritingPad } from "../features/practice/WritingPad";
import { TRIP, mapDir, mapSearch, type Stop } from "../data/trip";
type Level = "gentle" | "standard" | "careful";
type Rec = {
  version: 2;
  visited: string[];
  practice: Record<string, number[]>;
  current: { day: number; stop: number };
  settings: { traceStrictness: Level };
};
const KEY = "nagoya-kana-trip-records";
const blank = (): Rec => ({
  version: 2,
  visited: [],
  practice: {},
  current: { day: 0, stop: 0 },
  settings: { traceStrictness: "standard" },
});
const id = (d: number, s: number) => `${d}:${s}`;
function normalize(x: any): Rec {
  const r = blank();
  if (!x || typeof x !== "object") return r;
  const v = x.visited ?? x.arrived ?? x.done;
  r.visited = Array.isArray(v)
    ? v.filter((a: any) => typeof a === "string")
    : [];
  const p = x.practice ?? x.practiced ?? x.practiceProgress;
  if (p && typeof p === "object")
    for (const [k, a] of Object.entries(p))
      if (Array.isArray(a))
        r.practice[k] = a.filter(Number.isInteger) as number[];
  if (x.current)
    r.current = {
      day: Number(x.current.day) || 0,
      stop: Number(x.current.stop) || 0,
    };
  const l = x.settings?.traceStrictness;
  if (["gentle", "standard", "careful"].includes(l))
    r.settings.traceStrictness = l;
  return r;
}
function load() {
  for (const k of [
    KEY,
    "nagoya-trip-records",
    "trip-records",
    "nagoyaTripRecords",
  ])
    try {
      const x = localStorage.getItem(k);
      if (x) return normalize(JSON.parse(x));
    } catch {}
  return blank();
}
function say(t: string) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t);
  u.lang = "ja-JP";
  u.rate = 0.75;
  speechSynthesis.speak(u);
}
function Practice({
  stop,
  sid,
  rec,
  save,
  close,
}: {
  stop: Stop;
  sid: string;
  rec: Rec;
  save: (r: Rec) => void;
  close: () => void;
}) {
  const chars = [...stop.kana.normalize("NFC")],
    done = rec.practice[sid] ?? [];
  const [start] = useState(() => {
    const i = chars.findIndex((_, n) => !done.includes(n));
    return i < 0 ? 0 : i;
  });
  const [index, setIndex] = useState(start),
    [strokes, setStrokes] = useState<Point[][]>([]),
    [ink, setInk] = useState(false),
    [guide, setGuide] = useState<TraceGuideStroke[] | null>(null),
    [msg, setMsg] = useState(""),
    [reward, setReward] = useState(false),
    [resetKey, setResetKey] = useState(0),
    [replayKey, setReplayKey] = useState(0),
    [show, setShow] = useState(true);
  const kana = chars[index] ?? "";
  useEffect(
    () => setGuide(hasGlyph(kana) ? sampleGlyphGuide(kana) : null),
    [kana],
  );
  const reset = (i = index) => {
    setIndex(i);
    setStrokes([]);
    setInk(false);
    setMsg("");
    setReward(false);
    setResetKey((k) => k + 1);
  };
  const submit = () => {
    if (!ink || !guide) return;
    const e = evaluateTrace(strokes, guide, rec.settings.traceStrictness);
    if (!e.passed) {
      setMsg(traceFeedback(e));
      return;
    }
    const positions = [...new Set([...done, index])].sort((a, b) => a - b);
    save({ ...rec, practice: { ...rec.practice, [sid]: positions } });
    setMsg("");
    setReward(true);
  };
  const now = [...new Set([...done, ...(reward ? [index] : [])])];
  const complete = now.length === chars.length;
  const next = () => {
    const n = chars.findIndex((_, i) => !now.includes(i));
    reset(n < 0 ? 0 : n);
  };
  return (
    <main className="practice">
      <header>
        <button onClick={close}>← しおりへ</button>
        <strong>{stop.kana}</strong>
        <span>
          はんてい：
          {
            { gentle: "やさしい", standard: "ふつう", careful: "しっかり" }[
              rec.settings.traceStrictness
            ]
          }
        </span>
      </header>
      <nav className="kana-strip">
        {chars.map((c, i) => (
          <button
            key={i}
            className={`${i === index ? "active" : ""} ${now.includes(i) ? "complete" : ""}`}
            onClick={() => reset(i)}
          >
            {c}
          </button>
        ))}
      </nav>
      <div className="practice-grid">
        <section>
          <p className="current-kana">
            <small>
              {index + 1}/{chars.length}
            </small>
            {kana}
          </p>
          <WritingPad
            kana={kana}
            showGuide={show}
            animateGuide={false}
            replayKey={replayKey}
            resetKey={resetKey}
            onInkChange={setInk}
            onStrokesChange={(s) => {
              setStrokes(s);
              setMsg("");
            }}
          />
        </section>
        <aside>
          <button onClick={() => say(kana)}>🔊 きく</button>
          <button
            onClick={() => {
              setShow(true);
              setReplayKey((k) => k + 1);
            }}
          >
            ▶ おてほん
          </button>
          <button onClick={() => setShow((v) => !v)}>
            {show ? "🙈 かくす" : "👀 みる"}
          </button>
          <button className="done" disabled={!ink || !guide} onClick={submit}>
            ✓ できた
          </button>
        </aside>
      </div>
      {msg && (
        <p className="feedback" role="status">
          <b>{msg}</b>
          <span>「ひとつ もどす」か「けす」で なおしてね</span>
        </p>
      )}
      {reward && (
        <div className="reward" role="dialog">
          <section>
            <p>🎉 {kana} が かけたね！</p>
            <h2>{complete ? `${stop.kana} ぜんぶ かけた！` : "せいかい！"}</h2>
            <button onClick={next}>
              {complete ? "もういちど かく" : "つぎの もじ"}
            </button>
            <button onClick={close}>しおりを みる</button>
          </section>
        </div>
      )}
    </main>
  );
}
export function App() {
  const [rec, setRec] = useState(load),
    [day, setDay] = useState(rec.current.day),
    [selected, setSelected] = useState(rec.current.stop),
    [practice, setPractice] = useState(false),
    [parent, setParent] = useState(false);
  const trip = TRIP[day] ?? TRIP[0],
    stop = trip.stops[selected] ?? trip.stops[0],
    sid = id(day, selected);
  const save = (r: Rec) => {
    setRec(r);
    localStorage.setItem(KEY, JSON.stringify(r));
  };
  const select = (d: number, s: number) => {
    setDay(d);
    setSelected(s);
    save({ ...rec, current: { day: d, stop: s } });
  };
  const total = TRIP.reduce((n, d) => n + d.stops.length, 0),
    pc = useMemo(
      () =>
        TRIP.reduce(
          (n, d, di) =>
            n +
            d.stops.filter(
              (s, si) =>
                (rec.practice[id(di, si)]?.length ?? 0) === [...s.kana].length,
            ).length,
          0,
        ),
      [rec],
    );
  const exportJson = () => {
    const a = document.createElement("a"),
      u = URL.createObjectURL(
        new Blob([JSON.stringify(rec, null, 2)], { type: "application/json" }),
      );
    a.href = u;
    a.download = "nagoya-trip-records.json";
    a.click();
    URL.revokeObjectURL(u);
  };
  const importJson = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        save(normalize(JSON.parse(String(r.result))));
      } catch {
        alert("JSONを よみこめませんでした");
      }
    };
    r.readAsText(f);
  };
  if (practice)
    return (
      <Practice
        stop={stop}
        sid={sid}
        rec={rec}
        save={save}
        close={() => setPractice(false)}
      />
    );
  return (
    <div className="shell">
      <header className="top">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            select(0, 0);
          }}
        >
          <b>たびの しおり</b>
          <small>NAGOYA</small>
        </a>
        <button onClick={() => setParent(true)}>おうちのひと</button>
      </header>
      <main>
        <section className="hero">
          <div>
            <p>だいごの おでかけ　21〜23にち</p>
            <h1>なごや・ぎふへ いこう！</h1>
          </div>
          <div className="totals">
            <b>
              ついた！ {rec.visited.length} / {total}
            </b>
            <span>
              れんしゅう ★ {pc} / {total}
            </span>
          </div>
        </section>
        <nav className="days">
          {TRIP.map((d, i) => (
            <button
              key={i}
              aria-pressed={day === i}
              onClick={() => select(i, 0)}
            >
              <strong>{d.label}</strong>
              <small>{d.subtitle}</small>
            </button>
          ))}
        </nav>
        <details className="maps">
          <summary>Google マップで みちのりを みる ↗</summary>
          <ol>
            {trip.stops.slice(0, -1).map((s, i) => (
              <li key={i}>
                <a
                  href={mapDir(
                    s.place ?? s.label,
                    s.next ?? trip.stops[i + 1].label,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.kana} → {trip.stops[i + 1].kana} ↗
                </a>
                <small>{s.transport}</small>
              </li>
            ))}
          </ol>
        </details>
        <section className="layout">
          <div>
            <h2>きょうの みちのり</h2>
            <div className="route">
              {trip.stops.map((s, i) => (
                <div key={i}>
                  <button
                    className={`stop ${i === selected ? "selected" : ""} ${rec.visited.includes(id(day, i)) ? "visited" : ""}`}
                    onClick={() => select(day, i)}
                  >
                    <span>
                      <b>{s.kana}</b>
                      <small>{s.label}</small>
                    </span>
                    <em>
                      {rec.visited.includes(id(day, i))
                        ? "ついた！"
                        : i === selected
                          ? "いま"
                          : ""}
                    </em>
                  </button>
                  {i < trip.stops.length - 1 && (
                    <div className="transport">{s.transport}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <article className="detail">
            {stop.photo && <img src={stop.photo} alt={stop.label} />}
            <div className="detail-body">
              <span className="tag">{stop.tag}</span>
              <h2>{stop.kana}</h2>
              <p className="kanji">{stop.label}</p>
              <p>{stop.description}</p>
              {stop.infoLink && (
                <a className="info-link" href={stop.infoLink} target="_blank" rel="noreferrer">
                  {stop.infoLabel}
                </a>
              )}
              <div className="actions">
                <button onClick={() => say(stop.kana)}>なまえを きく ♪</button>
                <button className="primary" onClick={() => setPractice(true)}>
                  ひらがなを かく
                </button>
              </div>
              <div className="actions">
                <button
                  className="arrive"
                  onClick={() =>
                    save({
                      ...rec,
                      visited: rec.visited.includes(sid)
                        ? rec.visited.filter((x) => x !== sid)
                        : [...rec.visited, sid],
                    })
                  }
                >
                  {rec.visited.includes(sid) ? "ついた！を もどす" : "ついた！"}
                </button>
                {stop.place && (
                  <a
                    href={mapSearch(stop.place)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google マップ ↗
                  </a>
                )}
              </div>
              {(rec.practice[sid]?.length ?? 0) === [...stop.kana].length && (
                <p className="practice-complete">
                  ★ ひらがな れんしゅう かんりょう
                </p>
              )}
            </div>
            <div className="next">
              {selected < trip.stops.length - 1 ? (
                <>
                  <small>つぎは</small>
                  <strong>{trip.stops[selected + 1].kana}</strong>
                  <p>{stop.transport}</p>
                  <button onClick={() => select(day, selected + 1)}>
                    つぎへ すすむ →
                  </button>
                  {stop.next && (
                    <a
                      href={mapDir(stop.place ?? stop.label, stop.next)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Google マップで つぎまでの みちのり ↗
                    </a>
                  )}
                </>
              ) : (
                <>
                  <small>きょうの ゴール</small>
                  {day < 2 && (
                    <button onClick={() => select(day + 1, 0)}>
                      つぎの ひを みる →
                    </button>
                  )}
                </>
              )}
            </div>
          </article>
        </section>
      </main>
      {parent && (
        <div className="modal" role="dialog">
          <section>
            <button className="close" onClick={() => setParent(false)}>
              閉じる
            </button>
            <h2>おうちの方へ</h2>
            <p>
              「訪問済み」と「ひらがな練習完了」は別々に保存します。旧形式の記録も読み込み時に補正します。
            </p>
            <fieldset>
              <legend>なぞり判定</legend>
              {(["gentle", "standard", "careful"] as Level[]).map((l) => (
                <label key={l}>
                  <input
                    type="radio"
                    checked={rec.settings.traceStrictness === l}
                    onChange={() =>
                      save({ ...rec, settings: { traceStrictness: l } })
                    }
                  />
                  {
                    {
                      gentle: "やさしい",
                      standard: "ふつう",
                      careful: "しっかり",
                    }[l]
                  }
                </label>
              ))}
            </fieldset>
            <h3>スマホ・iPadへ記録を渡す</h3>
            <div className="actions">
              <button onClick={exportJson}>JSONを書き出す</button>
              <label className="file">
                JSONを読み込む
                <input
                  type="file"
                  accept="application/json"
                  onChange={(e) => importJson(e.target.files?.[0])}
                />
              </label>
            </div>
            <p>
              写真：Wikimedia Commons（CC BY-SA）。お手本：strokesvg / Klee
              One。
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
