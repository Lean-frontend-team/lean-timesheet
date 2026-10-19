// Styles for the panel's shadow root (ERP styles can't leak in)
export default `
:host { all: initial; }
* { box-sizing: border-box; font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; }
.overlay { position: fixed; inset: 0; z-index: 2147483000; background: rgba(15,23,42,.45); display: flex; align-items: center; justify-content: center; }
.panel { width: min(1240px, 96vw); height: 92vh; background: #f4f6f9; color: #1f2937; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,.3); }
.bar { background: #1f3a5f; color: #fff; padding: 14px 22px; display: flex; align-items: center; gap: 12px; }
.bar b { font-size: 18px; font-weight: 600; flex: 1; }
.bar button { background: none; border: 0; color: #fff; font-size: 26px; line-height: 1; cursor: pointer; opacity: .8; }
.bar button:hover { opacity: 1; }
.body { flex: 1; overflow: auto; padding: 22px 26px 28px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
h1 { margin: 0; font-size: 26px; font-weight: 600; }
.sub { color: #6b7785; font-size: 13px; margin-top: 2px; }
.picker { position: relative; }
.pick { min-width: 220px; display: flex; justify-content: space-between; align-items: center; gap: 12px; border: 1px solid #dde3ea; background: #fff;
        color: #1f2937; border-radius: 8px; padding: 9px 14px; font-size: 14px; cursor: pointer; }
.pick:hover, .pick.open { border-color: #2563eb; }
.pick .caret { color: #6b7785; font-size: 11px; }
.menu { position: absolute; right: 0; top: calc(100% + 6px); width: 260px; background: #fff; border: 1px solid #dde3ea; border-radius: 10px;
        box-shadow: 0 12px 30px rgba(15,23,42,.18); z-index: 10; overflow: hidden; }
.menu .quicks { display: flex; gap: 2px; padding: 8px 8px 6px; border-bottom: 1px solid #eef1f4; }
.quick { border: 0; background: none; color: #2563eb; font-size: 13px; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
.quick:hover { background: #eff6ff; }
.menu .list { max-height: 320px; overflow-y: auto; padding: 4px 0; }
.menu .year { font-size: 11px; font-weight: 600; color: #6b7785; letter-spacing: .05em; padding: 8px 14px 2px; }
.menu label { display: flex; align-items: center; gap: 10px; padding: 7px 14px; font-size: 14px; cursor: pointer; }
.menu label:hover { background: #f6f8fa; }
.menu input { width: 16px; height: 16px; accent-color: #2563eb; margin: 0; cursor: pointer; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 14px; }
.kpi { background: #fff; border: 1px solid #dde3ea; border-left: 5px solid var(--c); border-radius: 10px; padding: 12px 14px; }
.kpi .t { font-size: 11px; letter-spacing: .04em; color: #6b7785; text-transform: uppercase; }
.kpi .v { font-size: 26px; font-weight: 600; margin-top: 2px; }
.kpi .n { font-size: 11.5px; color: #6b7785; }
.banner { border-radius: 8px; padding: 12px 16px; font-weight: 600; margin-top: 8px; }
.ok { background: #e6f4ea; color: #1a7f37; } .bad { background: #fdecea; color: #c62828; }
.today { background: #eff6ff; color: #1d4ed8; font-size: 14.5px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.today .time { font-size: 20px; font-weight: 800; margin-left: 2px; }
.today .advice { flex-basis: 100%; margin-top: 6px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.today .advice.g { color: #1a7f37; } .today .advice.r { color: #c62828; }
.today .note { background: #f97316; color: #fff; font-size: 13px; font-weight: 700; border-radius: 999px; padding: 4px 12px; margin-right: 10px; }
.today.done { background: #e6f4ea; color: #1a7f37; } .today.off { background: #eef2f6; color: #6b7785; }
.section { background: #fff; border: 1px solid #dde3ea; border-radius: 10px; padding: 14px 18px; margin-top: 16px; }
.section h2 { margin: 0 0 10px; font-size: 16px; font-weight: 600; }
table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
th { background: #f6f8fa; color: #6b7785; font-weight: 600; padding: 9px 8px; text-align: center; }
td { padding: 8px; text-align: center; border-top: 1px solid #eef1f4; }
tr.total td { font-weight: 700; background: #eef2f6; }
tr.muted td { color: #8a94a3; } tr.zero td { background: #fdecea; }
td input[data-day] { width: 16px; height: 16px; accent-color: #2563eb; margin: 0; cursor: pointer; }
.badge { display: inline-block; border-radius: 999px; padding: 2px 10px; font-size: 12.5px; }
.g { color: #1a7f37; } .r { color: #c62828; } .p { color: #6d28d9; } .b { font-weight: 700; }
.center { padding: 60px; text-align: center; color: #6b7785; font-size: 15px; }
a { color: #2563eb; }
`;
