import { useRef } from 'react';
import type { ReactNode } from 'react';
import { sound } from './audio';

export default function SlotPrinter({
  children,
  maxPaperHeight,
  lang,
  printState, // 'idle' | 'printing' | 'completed' | 'torn'
  printProgress, // 0 to 100
  onStartPrint,
  onTearReceipt,
  onFeedPaper,
  onReset,
  isSoundMuted = false,
  onToggleSound,
  onOpenInspector,
}: { children: ReactNode; maxPaperHeight: number; lang: 'es' | 'en'; printState: string; printProgress: number; onStartPrint: () => void; onTearReceipt: () => void; onFeedPaper: () => void; onReset: () => void; isSoundMuted?: boolean; onToggleSound: () => void; onOpenInspector: () => void }) {
  const paperContainerRef = useRef<HTMLDivElement>(null);

  const isPrinting = printState === 'printing';
  const isCompleted = printState === 'completed';
  const isTorn = printState === 'torn';

  // Compact receipt total height
  const es = lang === 'es';

  // Real-time progressive height:
  // In idle state, paper is tucked neatly inside the slit (height = 6px).
  // When printing starts, it smoothly feeds downwards from 6px to 440px!
  const paperHeight = isPrinting
    ? 6 + (printProgress / 100) * (maxPaperHeight - 6)
    : isCompleted || isTorn
    ? maxPaperHeight
    : 6;

  // 3D Forward Arching Tilt Angle (X-axis rotation)
  // Origin is pinned at top center (inside the slit at Z=2px, behind upper lip Z=14px)
  // As paper gets longer, the bottom naturally arches forward towards the user!
  const tiltAngleX = isPrinting
    ? 4 + (printProgress / 100) * 11
    : isCompleted
    ? 15
    : isTorn
    ? 18
    : 4;

  // Micro-stepper motor vibration on the paper during active printing
  const stepperJitterY = isPrinting ? (Math.round(printProgress * 6) % 2 === 0 ? 0.3 : -0.3) : 0;

  // Handle click on the receipt
  const handlePaperClick = () => {
    if (isCompleted) {
      onTearReceipt();
    } else if (isTorn && onOpenInspector) {
      onOpenInspector();
    }
  };

  return (
    <div className="slot-printer-component">
      {/* 1. 3D MACHINE BEZEL ASSEMBLY (AT TOP OF SCREEN) */}
      <div className="printer-assembly-stage" style={{ minHeight: Math.max(480, maxPaperHeight + 100) }}>
        {/* The 3D Slot Bezel Chassis */}
        <div className="slot-bezel-chassis">
          {/* Base plate with rounded corners, silver-white satin bevel and 3D shadow */}
          <div className="slot-bezel-back-plate" />

          {/* Dark recessed slit channel cavity (Z = 0) */}
          <div className="slot-slit-channel">
            <div className="slot-cutter-metal-edge" />

            {/* Active glowing thermal laser printline during printing */}
            {isPrinting && <div className="slot-thermal-beam" />}

            {/* Paper stub remaining inside slit mouth after tearing */}
            {isTorn && (
              <div className="slot-paper-stub">
                <svg
                  viewBox="0 0 320 8"
                  className="stub-sawtooth-svg"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <polygon
                    points="0,8 10,0 20,8 30,0 40,8 50,0 60,8 70,0 80,8 90,0 100,8 110,0 120,8 130,0 140,8 150,0 160,8 170,0 180,8 190,0 200,8 210,0 220,8 230,0 240,8 250,0 260,8 270,0 280,8 290,0 300,8 310,0 320,8"
                    fill="#fbfbfa"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Lower Lip of the bezel (visible on sides under paper) */}
          <div className="slot-bezel-lower-lip" />

          {/* Emerging 3D Receipt Paper: Top is anchored INSIDE the slit (Z=2px), arches forward in 3D */}
          <div
            className={`slot-paper-feed-viewport ${
              isTorn ? 'is-torn-detached' : isPrinting ? 'is-printing-feed' : 'is-idle-loaded'
            }`}
            style={{
              height: `${paperHeight}px`,
              transform: isTorn
                ? 'translateX(-50%) translate3d(0, 26px, 45px) rotateX(18deg) rotateZ(-3deg)'
                : `translateX(-50%) translate3d(0, ${stepperJitterY}px, 2px) rotateX(${tiltAngleX}deg)`,
            }}
            onClick={handlePaperClick}
            role={isCompleted || isTorn ? "button" : undefined}
            tabIndex={isCompleted || isTorn ? 0 : undefined}
            aria-label={isCompleted ? (es ? "Desprender recibo" : "Tear receipt") : isTorn ? (es ? "Inspeccionar recibo" : "Inspect receipt") : undefined}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handlePaperClick(); } }}
            title={
              isCompleted
                ? 'Click Receipt to Tear'
                : isTorn
                ? 'Click to Inspect Detached Receipt'
                : undefined
            }
          >
            {/* 3D Paper Curvature Specular Lighting Reflection */}
            <div className="paper-3d-curvature-layer" aria-hidden="true" />

            <div className="slot-paper-sheet-wrap" ref={paperContainerRef}>
              {children}
            </div>
          </div>

          {/* Bezel Upper Lip Faceplate (Layered in front at Z=14px, so paper emerges from UNDER it!) */}
          <div className="slot-bezel-upper-lip" />
        </div>

        {/* Floating Action Hint Badges */}
        {isCompleted && (
          <button type="button" className="floating-action-badge tear-badge" onClick={onTearReceipt}>
            <span className="badge-icon">✂</span>
            <span>{es ? "DESPRENDER RECIBO" : "CLICK RECEIPT TO TEAR"}</span>
          </button>
        )}

        {isTorn && (
          <button type="button"
            className="floating-action-badge torn-badge"
            onClick={onOpenInspector}
          >
            <span className="badge-icon">📄</span>
            <span>{es ? "RECIBO DESPRENDIDO · INSPECCIONAR" : "RECEIPT DETACHED • CLICK TO INSPECT"}</span>
          </button>
        )}
      </div>

      {/* 2. COMPACT HARDWARE CONTROL CONSOLE DOCK */}
      <div className="three-console-dock">
        <div className="console-buttons-row">
          {/* Main Print Button with Real-time Progress */}
          <button
            type="button"
            className={`console-btn btn-primary-print ${
              isPrinting ? 'is-printing-btn' : ''
            }`}
            onClick={() => {
              sound.playButtonBeep(1400, 0.05);
              onStartPrint();
            }}
            disabled={isPrinting}
          >
            <span className="btn-icon-wrapper">
              {isPrinting ? (
                <svg
                  className="spin-loader"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
              )}
            </span>
            <span className="btn-label-text">
              {isPrinting
                ? `${es ? "IMPRIMIENDO" : "PRINTING"} ${Math.round(printProgress)}%`
                : isCompleted
                ? (es ? 'REIMPRIMIR' : 'RE-PRINT')
                : isTorn
                ? (es ? 'REIMPRIMIR' : 'RE-PRINT')
                : (es ? 'IMPRIMIR' : 'PRINT')}
            </span>
          </button>

          {/* Tear Paper Button */}
          <button
            type="button"
            className={`console-btn btn-action-tear ${
              isCompleted ? 'is-ready-to-tear' : ''
            }`}
            onClick={() => {
              sound.playButtonBeep(880, 0.04);
              onTearReceipt();
            }}
            disabled={!isCompleted}
            title={isCompleted ? 'Tear Receipt across cutter' : 'Print first to tear'}
          >
            <span className="btn-icon-wrapper">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="6" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <line x1="20" y1="4" x2="8.12" y2="15.88" />
                <line x1="14.47" y1="14.48" x2="20" y2="20" />
                <line x1="8.12" y1="8.12" x2="12" y2="12" />
              </svg>
            </span>
            <span className="btn-label-text">{es ? "DESPRENDER" : "TEAR"}</span>
          </button>

          {/* Feed Paper Button */}
          <button
            type="button"
            className="console-btn btn-action-feed"
            onClick={() => {
              sound.playButtonBeep(620, 0.03);
              onFeedPaper();
            }}
            disabled={isPrinting}
            title="Advance paper"
          >
            <span className="btn-icon-wrapper">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </span>
            <span className="btn-label-text">{es ? "AVANZAR" : "FEED"}</span>
          </button>

          {/* Reset / Preset Cycle Button */}
          <button
            type="button"
            className="console-btn btn-action-reset"
            disabled={isPrinting}
            onClick={() => {
              sound.playButtonBeep(520, 0.04);
              onReset();
            }}
            title={es ? "Reiniciar este recibo" : "Reset this receipt"}
          >
            <span className="btn-icon-wrapper">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </span>
            <span className="btn-label-text">{es ? "REINICIAR" : "RESET"}</span>
          </button>

          {/* Audio Mute / Unmute Button */}
          <button
            type="button"
            className={`console-btn btn-action-audio ${isSoundMuted ? 'muted' : ''}`}
            onClick={onToggleSound}
            title={isSoundMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            <span className="btn-icon-wrapper">
              {isSoundMuted ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </span>
            <span className="btn-label-text">{isSoundMuted ? (es ? 'SILENCIO' : 'MUTED') : 'AUDIO'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
