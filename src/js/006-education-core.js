


// Keyed by topic text → { points, objectives, duration, references }
// ══════════════════════════════════════════
const EDU_TOPICS = {
  // ── Stroke & Neuro ──
  'Acute Ischemic Stroke: Recognition & FAST Protocol': {
    duration: '15 min', objectives: 'Staff will identify stroke warning signs and activate stroke code within 5 minutes.',
    points: [
      'FAST: Face drooping, Arm weakness, Speech difficulty, Time to call 911 / activate code',
      'Additional signs: sudden severe headache, vision changes, dizziness, loss of balance',
      'Last known well time — why it matters for tPA eligibility window (4.5 hours)',
      'Immediate actions: activate Stroke Code, obtain IV access, draw stat labs, 12-lead EKG',
      'Do NOT give anything by mouth until swallow screen completed',
      'Document neuro checks every 15 minutes during acute phase',
    ],
    references: 'AHA/ASA Stroke Guidelines 2023 · AOMC Stroke Code Policy'
  },
  'NIH Stroke Scale (NIHSS): Competency & Documentation': {
    duration: '20 min', objectives: 'Staff will accurately administer and document the NIHSS.',
    points: [
      '11 items: LOC, gaze, visual fields, facial palsy, motor arm/leg, limb ataxia, sensory, language, dysarthria, extinction',
      'Score 0 = no deficit; higher scores indicate greater severity',
      'Score every 15 min during first 2 hours post-tPA; hourly for next 22 hours',
      'Worsening ≥4 points from baseline = notify provider immediately',
      'Use certified NIH Stroke Scale training — certification required annually',
      'Document in EHR at admission, 24h, discharge, and with any neuro change',
    ],
    references: 'NIHstrokescale.org · AOMC Stroke Protocol'
  },
  'tPA Administration: Eligibility Criteria & Nursing Responsibilities': {
    duration: '20 min', objectives: 'Staff will state tPA eligibility criteria and monitor for complications.',
    points: [
      'Inclusion: ischemic stroke, age ≥18, deficit measurable on NIHSS, onset within 4.5 hours',
      'Key exclusions: active bleeding, BP >185/110 uncontrolled, recent surgery, anticoagulation',
      'Dose: 0.9 mg/kg (max 90 mg) — 10% bolus over 1 min, remainder over 60 min',
      'During infusion: BP q15 min, neuro checks q15 min, NO anticoagulants for 24h',
      'STOP infusion if: BP >180/105 unresponsive, neuro worsening, angioedema, severe headache',
      'Post-tPA: no Foley, NG, arterial lines for 30 min; no IM injections',
    ],
    references: 'AOMC tPA Administration Policy · AHA 2023 Guidelines'
  },
  'Blood Transfusion Administration & Reaction Management': {
    duration: '15 min', objectives: 'Staff will safely administer blood products and manage transfusion reactions.',
    points: [
      'Verify: two RN identifiers, patient armband + blood product label match at bedside',
      'Start slowly: 25-50 mL/hr for first 15 min — stay at bedside',
      'Vital signs: baseline, 15 min after start, 30 min, hourly, completion',
      'Signs of reaction: fever, chills, back pain, hypotension, hives, SOB — STOP transfusion',
      'Reaction management: stop blood, keep IV open with NS, notify provider, send unit back to blood bank',
      'Transfuse within 4 hours of issue; most products expire 4h after leaving blood bank',
    ],
    references: 'AOMC Blood Administration Policy · AABB Standards'
  },
  'Sepsis Recognition: qSOFA, SIRS Criteria & Lactate': {
    duration: '15 min', objectives: 'Staff will identify early sepsis and initiate the 3-hour bundle.',
    points: [
      'qSOFA (quick screen): RR ≥22, AMS, SBP ≤100 — 2 of 3 = suspect sepsis',
      'SIRS criteria: temp >38 or <36, HR >90, RR >20, WBC >12k or <4k or >10% bands',
      'Sepsis = infection + organ dysfunction (SOFA score increase ≥2)',
      '3-hour bundle: obtain blood cultures x2, lactate, broad-spectrum antibiotics, 30 mL/kg NS if hypotensive',
      'Lactate >2 = tissue hypoperfusion; lactate >4 = high mortality, trigger septic shock protocol',
      'Time matters: 1-hour delay in antibiotics increases mortality by 7%',
    ],
    references: 'Surviving Sepsis Campaign 2021 · AOMC Sepsis Protocol'
  },
  'Central Line Maintenance & CLABSI Bundle Compliance': {
    duration: '15 min', objectives: 'Staff will perform central line care per CLABSI prevention bundle.',
    points: [
      'Daily: assess line necessity — remove if no longer indicated (document indication)',
      'Dressing change: sterile technique, CHG-impregnated sponge, change q7 days or if soiled/loose',
      'Cap changes: needleless connectors q96h and after blood draw or anytime grossly contaminated',
      'CHG bath: daily for all central line patients — document in EHR',
      'Hand hygiene: before and after any line access — no exceptions',
      'Report any insertion site erythema, drainage, or fever to provider — culture before antibiotics',
    ],
    references: 'CDC CLABSI Guidelines · AOMC Central Line Bundle Policy'
  },
  'Pain Assessment: Numeric, FACES, CPOT for Non-Verbal': {
    duration: '10 min', objectives: 'Staff will select the appropriate pain tool and document reassessment.',
    points: [
      'Numeric (0-10): use for alert, oriented patients — ask patient to rate',
      'FACES: use for pediatric, cognitive impairment, or language barriers',
      'CPOT (Critical Care Pain Observation Tool): facial expression, body movements, muscle tension, ventilator compliance',
      'Reassessment: within 30 minutes of any pain intervention — document in EHR',
      'Non-verbal signs: grimacing, guarding, restlessness, elevated HR/BP — treat and reassess',
      'Goal: pain controlled to functional level — not necessarily 0',
    ],
    references: 'AOMC Pain Management Policy · TJC Pain Standards'
  },
  'Pain Management: Multimodal Approach & Opioid Safety': {
    duration: '15 min', objectives: 'Staff will apply multimodal pain strategies and monitor for opioid adverse effects.',
    points: [
      'Multimodal: combine non-opioid (acetaminophen, NSAIDs, ice, positioning) with opioids when needed',
      'Non-pharmacologic: repositioning, distraction, heat/cold, guided breathing, music therapy',
      'Opioid safety: assess sedation level (POSS scale) before each dose',
      'Hold opioid if: POSS score 3-4, RR <8, SpO2 <92% — notify provider',
      'Naloxone: know location on unit, indication, dose (0.4 mg IV/IM), call rapid response',
      'Document: pain score before, intervention given, pain score 30 min after — every time',
    ],
    references: 'AOMC Pain Management Policy · CDC Opioid Prescribing Guidelines'
  },
  'Fall Prevention: ABCDE Bundle & Bed Alarm Compliance': {
    duration: '10 min', objectives: 'Staff will implement fall prevention interventions for high-risk patients.',
    points: [
      'Morse Scale: score ≥45 = high fall risk — implement all precautions',
      'ABCDE: Awareness (yellow armband/magnet), Bed alarm on, Call light within reach, Door open, Environment clear',
      'Hourly rounding: round every hour, ask about pain, position, potty, possessions, proximity',
      'High-risk medications: opioids, benzodiazepines, antihypertensives, diuretics — extra vigilance',
      'Post-fall: do NOT move patient, assess for injury, notify provider, complete incident report',
      'Bed alarm compliance: check alarm is active every time you leave the room',
    ],
    references: 'AOMC Fall Prevention Policy · Morse Fall Scale'
  },
  'Medication Scanning Compliance: 5 Rights & 2 Identifiers': {
    duration: '10 min', objectives: 'Staff will achieve ≥95% medication scanning compliance.',
    points: [
      '5 Rights: Right patient, drug, dose, route, time — verify EVERY administration',
      '2 Identifiers: full name + date of birth — confirm before every medication',
      'Scan the medication AND the patient armband — both required, no exceptions',
      'Override alerts: only override for emergencies — document reason; report patterns to pharmacy',
      'Do not scan for another nurse or batch-scan — this circumvents safety checks',
      'Scanning rate target: ≥95% — unit performance tracked monthly and reported to leadership',
    ],
    references: 'AOMC Medication Administration Policy · TJC NPSG 3.06'
  },
  'Pressure Injury Prevention: Staging & Braden Scale': {
    duration: '15 min', objectives: 'Staff will accurately stage pressure injuries and implement prevention bundle.',
    points: [
      'Braden Scale: <18 = at risk; 15-18 moderate, 13-14 high, ≤12 very high risk',
      'Staging: Stage 1 (non-blanchable erythema), 2 (partial thickness), 3 (full thickness), 4 (bone/tendon), Unstageable, DTI',
      'Prevention bundle: turn q2h, moisture management, nutrition consult, offloading heels',
      'Document skin assessment on admission and each shift — photograph any wounds',
      'Pressure relief: specialty mattress, heel boots, wedge pillow for 30° lateral turn',
      'Report any new skin breakdown to provider and Wound Care team immediately',
    ],
    references: 'NPUAP Pressure Injury Staging · AOMC Skin Integrity Policy'
  },
  'Hand Hygiene Compliance: WHO 5 Moments': {
    duration: '10 min', objectives: 'Staff will perform hand hygiene at all 5 WHO moments.',
    points: [
      'Moment 1: BEFORE touching a patient',
      'Moment 2: BEFORE a clean/aseptic procedure',
      'Moment 3: AFTER body fluid exposure risk',
      'Moment 4: AFTER touching a patient',
      'Moment 5: AFTER touching patient surroundings',
      'Use alcohol-based hand rub for most situations; soap and water for C. diff, norovirus, visible soil',
      'Compliance target: ≥90% — observed compliance is reported monthly',
    ],
    references: 'WHO Hand Hygiene Guidelines · CDC Hand Hygiene'
  },
  'Press Ganey: Nurse Communication Strategies': {
    duration: '10 min', objectives: 'Staff will apply communication techniques that improve patient satisfaction.',
    points: [
      'AIDET: Acknowledge, Introduce, Duration, Explanation, Thank you — use every interaction',
      'Sit at eye level when possible — 1 minute sitting = patient perceives 20 more minutes of care',
      'Explain before you do it: "I am going to take your blood pressure now"',
      'Close the loop: "Is there anything else I can do for you before I leave?"',
      'Respond to call lights within 3 minutes — even if just to say "I\'ll be right with you"',
      'Nurse communication score directly tied to overall satisfaction and CMS reimbursement',
    ],
    references: 'HCAHPS Communication Domain · Press Ganey Nurse Communication'
  },
  // ── CA Topics ──
  'Vital Signs: BP, Pulse, SpO2, Temperature, Respiration Rate': {
    duration: '10 min', objectives: 'CA will obtain accurate vital signs and report abnormal values immediately.',
    points: [
      'Blood pressure: correct cuff size, patient resting 5 min, arm at heart level',
      'Report immediately: SBP >180 or <90, DBP >110, HR >120 or <50, SpO2 <92%, RR <8 or >28',
      'Temperature: oral (most accurate), axillary (add 1°F), tympanic (add 0.5°F)',
      'Report fever ≥38.0°C (100.4°F) or hypothermia <36°C (96.8°F) to nurse',
      'Pulse oximetry: warm fingertip, no nail polish, steady waveform before recording',
      'Document accurately — do not estimate or guess — alert nurse before charting abnormals',
    ],
    references: 'AOMC CA Scope of Practice · Vital Signs Documentation Policy'
  },
  'Proper Lifting & Transfer Techniques: Gait Belt, Hoyer Lift': {
    duration: '15 min', objectives: 'CA will safely transfer patients using appropriate equipment.',
    points: [
      'No-lift policy: use mechanical lift for non-weight bearing or maximum assist patients',
      'Gait belt: position 2 inches above waist, snug but one hand fits under — buckle secured',
      'Hoyer lift: verify weight limit, check sling for tears, lower patient slowly, never leave unattended',
      'Two-person assist: communicate before moving, count together, move on "3"',
      'Patient positioning: HOB ≥30° for aspiration risk patients, 30° lateral turn for skin',
      'Report any patient pain, resistance, or adverse event during transfer to nurse immediately',
    ],
    references: 'AOMC No-Lift Policy · Safe Patient Handling Program'
  },
  'Recognizing Stroke Warning Signs: FAST (Face, Arm, Speech, Time)': {
    duration: '10 min', objectives: 'CA will identify stroke signs and notify nurse immediately.',
    points: [
      'F — Face: ask patient to smile — is one side drooping?',
      'A — Arms: ask patient to raise both arms — does one drift down?',
      'S — Speech: ask patient to repeat a phrase — is speech slurred or strange?',
      'T — Time: if ANY of these are present — call the nurse IMMEDIATELY, note the time',
      'DO NOT leave the patient alone — stay and keep them calm',
      'CA cannot diagnose — but CA is often first to notice a change — early recognition saves brains',
    ],
    references: 'AHA FAST Campaign · AOMC Stroke Code Policy'
  },
  'AIDET Communication Framework: Acknowledge, Introduce, Duration...': {
    duration: '10 min', objectives: 'CA will use AIDET in every patient interaction.',
    points: [
      'A — Acknowledge: make eye contact, greet by name, knock before entering',
      'I — Introduce: state your name and role: "Hi, I\'m [Name], your care assistant today"',
      'D — Duration: set expectations: "Your bath should take about 15 minutes"',
      'E — Explanation: explain what you are doing before you do it — no surprises',
      'T — Thank you: "Thank you for letting me help you today. Is there anything else?"',
      'Patients judge their entire hospital experience on staff communication — you are the face of 3B',
    ],
    references: 'Studer Group AIDET · Press Ganey CA Communication'
  },
  'CA Scope of Practice: What CAs Can & Cannot Do at AOMC': {
    duration: '10 min', objectives: 'CA will identify tasks within and outside their scope.',
    points: [
      'CAN DO: vital signs, ADLs, ambulation assist, I&O, glucometry per training, positioning, skin assessment reporting',
      'CANNOT DO: medication administration, IV access, catheter insertion, interpretation of assessment findings',
      'Gray zone: blood glucose — trained CAs may perform, must report result to nurse before acting',
      'When in doubt: ask your nurse — never perform a task you have not been trained and validated for',
      'Scope violations: patient safety risk, liability, and disciplinary action',
      'Your job is to be the extra eyes and ears — report early, communicate often',
    ],
    references: 'AOMC CA Job Description · NYS Nurse Practice Act'
  },
  'Hand Hygiene: 5 Moments – When, How, Why': {
    duration: '10 min', objectives: 'CA will perform hand hygiene at correct moments.',
    points: [
      '5 Moments: Before patient contact, Before procedure, After body fluid exposure, After patient contact, After patient surroundings',
      'Alcohol gel: 2-3 pumps, rub all surfaces including thumbs and fingernails, 20 seconds',
      'Soap and water: wet hands, soap, 20 seconds, rinse down, dry with paper towel, use towel to turn off faucet',
      'Soap and water required: C. diff, norovirus, visible soil, after restroom',
      'Rings and nail polish harbor bacteria — check unit policy on jewelry',
      'You touch 50–100 patients per shift — your hands are the most common vector for HAIs',
    ],
    references: 'WHO 5 Moments for Hand Hygiene · AOMC Infection Control Policy'
  },
};

// ── Print Education Sheet (page 3) ──────────────────────────────────────────
function printEduSheet() {
  const wk  = getWeekKey(new Date());
  const edu = (state.weeklyEdu[wk]) || { nurseTopics:[], caTopics:[], notes:'' };
  const now = new Date();
  const sun = new Date(now); sun.setDate(now.getDate() - now.getDay());
  const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
  const weekRange = sun.toLocaleDateString('en-US',{month:'short',day:'numeric'}) +
    ' – ' + sat.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});

  function buildTopicHTML(topic, role) {
    const info = EDU_TOPICS[topic];
    const roleColor = role === 'nurse' ? '#1a3a5c' : '#0e7490';
    const roleLabel = role === 'nurse' ? '🩺 NURSE / LPN TOPIC' : '🏥 CA TOPIC';
    let html = `<div style="page-break-inside:avoid;margin-bottom:24px;border:1px solid #ddd;border-radius:8px;overflow:hidden;">`;
    html += `<div style="background:${roleColor};color:#fff;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;">
      <strong style="font-size:11pt;">${topic}</strong>
      <span style="font-size:8pt;opacity:0.8;">${roleLabel} · ${info ? info.duration : '10 min'}</span>
    </div>`;
    html += `<div style="padding:12px 14px;">`;
    if (info) {
      html += `<p style="font-size:9pt;color:#444;margin:0 0 10px;font-style:italic;border-left:3px solid ${roleColor};padding-left:8px;"><strong>Objective:</strong> ${info.objectives}</p>`;
      html += `<strong style="font-size:9pt;color:#222;">Discussion Points:</strong><ul style="margin:6px 0 0 0;padding-left:20px;">`;
      info.points.forEach(p => {
        html += `<li style="font-size:9.5pt;margin-bottom:5px;line-height:1.4;">${p}</li>`;
      });
      html += `</ul>`;
      if (info.references) {
        html += `<div style="margin-top:10px;font-size:8pt;color:#888;border-top:1px solid #eee;padding-top:6px;"><strong>References:</strong> ${info.references}</div>`;
      }
    } else {
      // Custom topic with no library entry — print a blank discussion guide
      html += `<strong style="font-size:9pt;color:#222;">Discussion Points:</strong>
      <ul style="margin:6px 0 0 0;padding-left:20px;">
        <li style="font-size:9.5pt;margin-bottom:8px;color:#999;font-style:italic;">Review current policy and procedure with staff.</li>
        <li style="font-size:9.5pt;margin-bottom:8px;color:#999;font-style:italic;">Identify 3 key takeaways relevant to 3B practice.</li>
        <li style="font-size:9.5pt;margin-bottom:8px;color:#999;font-style:italic;">Ask staff: "What would you do if...?" — scenario-based discussion.</li>
      </ul>`;
    }
    // Sign-off grid
    html += `<div style="margin-top:12px;"><div style="font-size:8pt;font-weight:700;color:#555;margin-bottom:6px;">Staff Acknowledgment — I received this education:</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">`;
    for (let i=0; i<8; i++) {
      html += `<div style="border:1px solid #ccc;border-radius:4px;padding:5px 6px;font-size:7.5pt;">
        <div style="border-bottom:1px dotted #ccc;margin-bottom:4px;height:14px;"></div>
        <div style="color:#999;font-size:7pt;">Name / Initials</div>
      </div>`;
    }
    html += `</div></div>`;
    html += `</div></div>`;
    return html;
  }

  const allTopics = [
    ...(edu.nurseTopics||[]).map(t => ({ topic: t, role: 'nurse' })),
    ...(edu.caTopics||[]).map(t => ({ topic: t, role: 'ca' })),
  ];

  if (!allTopics.length) {
    alert('No education topics selected for this week. Click ✏ Edit to add topics first.');
    return;
  }

  const w = window.open('', '_blank');
  if (!w) { alert('Popup blocked. Please allow popups for this page and try again.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>3B Weekly Education — ${weekRange}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; font-size:10pt; color:#111; background:#fff; margin:20px; }
    h1 { font-size:14pt; font-weight:bold; margin-bottom:2px; }
    h2 { font-size:11pt; color:#1a3a5c; border-bottom:2px solid #1a3a5c; padding-bottom:4px; margin:16px 0 10px; }
    @page { size:letter; margin:0.5in; }
    @media print { body { margin:0; } }
  </style></head><body>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;border-bottom:3px solid #1a3a5c;padding-bottom:10px;">
    <div>
      <h1>📚 3B Tele Med Surg — Weekly Education</h1>
      <div style="font-size:9pt;color:#666;margin-top:2px;">Week of ${weekRange} · Printed ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div>
      <div style="font-size:9pt;color:#666;">AOMC Nursing Operations · 3B Tele Med Surg</div>
    </div>
    <div style="text-align:right;font-size:8pt;color:#888;">
      <div>${allTopics.length} topic${allTopics.length>1?'s':''} this week</div>
      <div>${(edu.nurseTopics||[]).length} Nurse · ${(edu.caTopics||[]).length} CA</div>
    </div>
  </div>

  ${edu.notes ? `<div style="background:#f8f8f8;border:1px solid #ddd;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:9pt;"><strong>Notes / Resources:</strong> ${ccEsc(edu.notes)}</div>` : ''}

  ${allTopics.map(({topic, role}) => buildTopicHTML(topic, role)).join('')}

  <div style="margin-top:24px;border-top:1px solid #ccc;padding-top:10px;font-size:8pt;color:#888;text-align:center;">
    3B Tele Med Surg · AOMC Nursing Operations · Weekly Staff Education Document
  </div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}


const EDU_LIBRARY = {
  nurse: {
    // ── Stroke / Neuro ──
    'Stroke & Neuro': [
      'Acute Ischemic Stroke: Recognition & FAST Protocol',
      'Hemorrhagic Stroke vs. Ischemic Stroke: Key Differences',
      'tPA Administration: Eligibility Criteria & Nursing Responsibilities',
      'NIH Stroke Scale (NIHSS): Competency & Documentation',
      'Post-tPA Monitoring: Hemorrhagic Transformation Signs',
      'Mechanical Thrombectomy: Pre & Post-procedure Nursing Care',
      'Stroke Code Activation: Unit Protocol & Timelines',
      'Door-to-Needle Time: Nursing Role in Achieving <60 Minutes',
      'Dysphagia Screening Post-Stroke: Bedside Assessment',
      'Stroke Discharge Education: What Patients Need to Know',
      'Transient Ischemic Attack (TIA): Management & Secondary Prevention',
      'Anticoagulation Therapy in Atrial Fibrillation & Stroke Prevention',
      'Carotid Artery Disease: Nursing Care & Monitoring',
      '30-Day Readmission Prevention: Stroke Patient Follow-Up',
    ],
    // ── Med-Surg Clinical Skills ──
    'Clinical Skills': [
      'Central Line Maintenance & CLABSI Bundle Compliance',
      'PICC Line Care: Dressing Change & Troubleshooting',
      'IV Access: Peripheral IV Insertion & Phlebitis Assessment',
      'Foley Catheter Insertion & CAUTI Prevention Bundle',
      'Wound Assessment & Dressing Change Technique',
      'Pressure Injury Prevention: Staging & Braden Scale',
      'Nasogastric Tube Insertion & Verification',
      'Blood Transfusion Administration & Reaction Management',
      'Cardiac Telemetry: Rhythm Recognition (Afib, SVT, V-Tach, V-Fib)',
      'Chest Tube Management: Drainage Assessment & Troubleshooting',
      'Arterial Line Management & Waveform Interpretation',
      'Tracheostomy Care & Suctioning Technique',
      'PEG Tube Care & Enteral Feeding Administration',
      'Insulin Administration & Hypoglycemia Management',
      'Subcutaneous Injection & Anticoagulant Administration',
    ],
    // ── Medication Safety ──
    'Medication Safety': [
      'High-Alert Medications: Heparin, Insulin, Opioids',
      'Medication Scanning Compliance: 5 Rights & 2 Identifiers',
      'Anticoagulation Monitoring: INR, aPTT, Anti-Xa Levels',
      'Pain Management: Multimodal Approach & Opioid Safety',
      'Antibiotic Stewardship: Culture Before Treat, SBAR Reporting',
      'IV Medication Compatibility & Infusion Rate Safety',
      'Look-Alike/Sound-Alike (LASA) Drug Errors Prevention',
      'Controlled Substance Wasting & Documentation Compliance',
      'Oral Medication Crushing: Do Not Crush List',
      'Patient-Controlled Analgesia (PCA) Pump Safety',
    ],
    // ── Assessment ──
    'Patient Assessment': [
      'Neurological Assessment: Glasgow Coma Scale & Pupillary Response',
      'Respiratory Assessment: Breath Sounds & O2 Titration',
      'Cardiac Assessment: S3/S4 Gallop, JVD, Edema Grading',
      'Pain Assessment: Numeric, FACES, CPOT for Non-Verbal',
      'Fall Risk Assessment: Morse Scale & Hourly Rounding',
      'SBAR Communication: Reporting Changes to Provider',
      'Sepsis Recognition: qSOFA, SIRS Criteria & Lactate',
      'Rapid Response Activation: When & How to Call',
      'Head-to-Toe Assessment: Prioritization Techniques',
      'Skin Integrity Assessment: Moisture-Associated Skin Damage',
    ],
    // ── Quality & Safety ──
    'Quality & Safety': [
      'Pain Reassessment: 30-Minute Post-Intervention Documentation',
      'Hand Hygiene Compliance: WHO 5 Moments',
      'Isolation Precautions: Contact, Droplet, Airborne, Protective',
      'Patient Identification: Two Identifiers Before All Interventions',
      'Falls Prevention: ABCDE Bundle & Bed Alarm Compliance',
      'Pressure Injury Prevention: Turn & Reposition Documentation',
      'CLABSI Bundle: CHG Bathing, Line Necessity Review',
      'CAUTI Bundle: Foley Indication, Perineal Care',
      'Restraint Use: Indications, Assessment & Alternatives',
      'Event Reporting: RL Solutions & Near-Miss Culture',
      'Hand-off Communication: I-PASS & SBAR Bedside Handoff',
      'Press Ganey: Nurse Communication Strategies',
      'Quiet Hours Protocol: HCAHPS Impact',
    ],
    // ── Policies & Procedures ──
    'Policies & Procedures': [
      'AOMC Stroke Protocol — Door-to-Needle Policy',
      'Blood Administration Policy: Type & Screen, Consent, Monitoring',
      'Rapid Response & Code Blue: AOMC Activation Policy',
      'Restraint Policy: Indications, Documentation, Release Q2H',
      'Fall Prevention Policy: Risk Categories & Interventions',
      'Patient Rights & Grievance: Reporting & Resolution Process',
      'Medication Administration Policy: 5 Rights & Override Policy',
      'Advance Directive / DNR: Documentation & Communication',
      'Discharge Planning Policy: INTERACT, 30-Day Readmission',
      'Mandatory Reporting Policy: Abuse, Neglect, Sentinel Events',
      'Bed Placement & Telemetry Monitoring Policy',
      'Skin Integrity & Wound Care Formulary Policy',
      'Labor & Delivery Diversion & Surge Capacity Policy',
      'HIPAA: Patient Privacy & Social Media Policy',
    ],
  },

  ca: {
    // ── Direct Care Skills ──
    'Direct Care Skills': [
      'Vital Signs: BP, Pulse, SpO2, Temperature, Respiration Rate',
      'Proper Lifting & Transfer Techniques: Gait Belt, Hoyer Lift',
      'Repositioning & Turning: 2-Hour Turn Schedule & Documentation',
      'Oral Care: Toothbrushing, Suction Toothette, Chlorhexidine',
      'Peri-Care & Foley Catheter Hygiene',
      'Incontinence Care & Skin Barrier Application',
      'Bathing: Bed Bath, CHG Bath, Basin Protocol',
      'AM & PM Care: Grooming, Linen Change, Mouth Care',
      'Intake & Output: Accurate Measurement & Documentation',
      'Glucometry: Fingerstick Technique & Reporting Critical Values',
      'Urinal & Bedpan Use: Dignity & Proper Technique',
      'Feeding Assistance: Aspiration Precautions & Positioning',
      'Ambulation Assist: Safe Distance, Gait Belt, Reporting Falls',
      'Compression Device (SCD) Application & Maintenance',
      'Anti-embolism Stockings: Application & Skin Check',
      'Bed Alarm Activation & Fall Prevention Measures',
    ],
    // ── Safety & Observation ──
    'Safety & Observation': [
      'Patient Identification: Two Identifiers Before All Care',
      'Hand Hygiene: 5 Moments – When, How, Why',
      'Isolation Precautions: Contact, Droplet, Airborne — PPE Steps',
      'Fall Prevention: Hourly Rounding, Call Light Within Reach',
      'Restraint Monitoring: Q2H Assessment & Documentation',
      'Reporting Changes: When to Notify the Nurse Immediately',
      'Elopement Risk: Identifying & Responding to Wandering Patients',
      'Sitter Responsibilities: 1:1 Observation Standards',
      'Environmental Safety: Clutter-Free Path, Wet Floors',
      'Fire Safety: RACE & PASS — Extinguisher Use',
      'Emergency Codes: Code Blue, Code Red, Code Gray Roles',
    ],
    // ── Stroke & Neuro Awareness ──
    'Stroke & Neuro Awareness': [
      'Recognizing Stroke Warning Signs: FAST (Face, Arm, Speech, Time)',
      'Your Role in a Stroke Code: Notify, Prepare, Support',
      'Post-Stroke Care: Swallowing Precautions & Aspiration Risk',
      'Neurological Changes: What to Report to the Nurse',
      'Range of Motion (ROM) Exercises: Passive & Active Assist',
      'Positioning the Stroke Patient: HOB, Side-Lying, Contracture Prevention',
    ],
    // ── Communication ──
    'Communication & Teamwork': [
      'Therapeutic Communication: Dignity, Empathy, Active Listening',
      'AIDET Communication Framework: Acknowledge, Introduce, Duration...',
      'Press Ganey & Patient Satisfaction: Your Role in Scores',
      'Responding to Patient Call Lights Within 3 Minutes',
      'Quiet Time Protocol: Reducing Nighttime Disruptions',
      'Cultural Sensitivity & Language Access Services',
      'Workplace Conflict: De-escalation & Reporting Chain',
      'Teamwork & SBAR Lite: Giving Brief Report to the Nurse',
    ],
    // ── Policies & Procedures ──
    'Policies & Procedures': [
      'CA Scope of Practice: What CAs Can & Cannot Do at AOMC',
      'Restraint Policy: CA Role in Q2H Monitoring & Documentation',
      'Fall Prevention Policy: CA Responsibilities & Bed Alarm Use',
      'Patient Rights: Dignity, Privacy, Choice in Daily Care',
      'Abuse & Neglect: Mandatory Reporting Obligation',
      'HIPAA for CAs: What Not to Say, Share, or Post',
      'Incident Reporting: How to File a Report in RL Solutions',
      'Dress Code & Professionalism Policy',
      'Overtime & Scheduling Policy: Call-In, Tardy, NCNS',
      'Workplace Violence Prevention & De-escalation Policy',
      'Hand-Off Communication: CA-to-CA Safe Shift Change',
      'No Lift Policy & Body Mechanics Compliance',
    ],
  },
};

function initEduPickers() {
  renderEduPickerList('nurse', '');
  renderEduPickerList('ca', '');
}

function filterEduPicker(role, query) {
  // Auto-fill the custom input with search text
  const inp = document.getElementById(role+'-topic-input');
  if (inp && query) inp.value = query;
  renderEduPickerList(role, query);
}

function renderEduPickerList(role, query) {
  const el = document.getElementById(role+'-picker-list');
  if (!el) return;
  const lib = EDU_LIBRARY[role] || {};
  const q = (query||'').toLowerCase().trim();
  const edu = getWeekEdu();
  const selected = role === 'nurse' ? (edu.nurseTopics||[]) : (edu.caTopics||[]);

  let html = '';
  let anyShown = false;

  Object.entries(lib).forEach(([category, topics]) => {
    const filtered = topics.filter(t =>
      !q || t.toLowerCase().includes(q)
    );
    if (!filtered.length) return;
    anyShown = true;
    html += `<div style="padding:4px 8px;font-size:11px;font-weight:700;color:var(--text3);background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.06);letter-spacing:0.5px;text-transform:uppercase;">${category}</div>`;
    filtered.forEach(topic => {
      const isAdded = selected.includes(topic);
      const c = role === 'nurse' ? 'var(--accent2)' : 'var(--teal2)';
      html += `<div onclick="${isAdded?'':'quickAddEduTopic(\''+role+'\',\''+topic.replace(/'/g,"\\'")+'\')'}" 
        style="padding:5px 10px;font-size:11px;cursor:${isAdded?'default':'pointer'};display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);${isAdded?'opacity:0.4;':''}hover:background:rgba(255,255,255,0.08);"
        onmouseover="if(!${isAdded})this.style.background='rgba(255,255,255,0.06)'"
        onmouseout="this.style.background=''">
        <span style="flex:1;">${topic}</span>
        ${isAdded
          ? '<span style="color:var(--green2);font-size:11px;margin-left:8px;">✓ Added</span>'
          : `<span style="color:${c};font-size:11px;margin-left:8px;font-weight:700;">+ Add</span>`}
      </div>`;
    });
  });

  if (!anyShown && q) {
    html = `<div style="padding:8px 10px;font-size:11px;color:var(--text3);">No matches — use the custom input below to add "${query}"</div>`;
  } else if (!anyShown) {
    html = `<div style="padding:8px 10px;font-size:11px;color:var(--text3);">Search above to find topics</div>`;
  }

  el.innerHTML = html;
}

function quickAddEduTopic(role, topic) {
  const edu = getWeekEdu();
  const key = role === 'nurse' ? 'nurseTopics' : 'caTopics';
  if (!edu[key]) edu[key] = [];
  if (edu[key].includes(topic)) return;
  edu[key].push(topic);
  persistSave();
  renderBoardWeeklyEdu();
  // Refresh the picker to show it as added
  const searchEl = document.getElementById(role+'-topic-search');
  renderEduPickerList(role, searchEl ? searchEl.value : '');
}

function toggleBoardEduEdit() {
  const ed = document.getElementById('board-edu-edit');
  if (!ed) return;
  const isOpen = ed.style.display !== 'none';
  ed.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    renderBoardWeeklyEdu();
    initEduPickers();
  }
}

function renderBoardDateTabs() {
  buildDateTabs('date-tabs', state.activeBoardDate, 'selectBoardDate', renderBoard);
}

function renderOpenShifts() { /* removed — open shifts widget removed */ }

function selectBoardDate(d) {
  state.activeBoardDate = d;
  renderBoardDateTabs();
  renderBoard();
  updateRatios();
  renderTrackingGrid();
  renderVacancy();
  renderOpenShifts();
}

function renderBoard() {
  const dateKey = state.activeBoardDate;
  const bv = document.getElementById('board-view');

  if (!dateKey) {
    bv.innerHTML = `<div class="card" style="text-align:center;padding:40px;">
      <div style="font-size:32px;margin-bottom:12px;">📋</div>
      <div style="font-size:14px;font-weight:700;color:var(--white);margin-bottom:8px;">No Staffing Data Loaded</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:16px;">Import your UKG Daily Staffing Condensed export to see the board</div>
      <button class="btn btn-primary" onclick="switchTab(document.querySelector('[data-panel=import]'))">⬆ Go to Import</button>
    </div>`;
    renderBoardCertAlerts();
    renderBoardCompAlerts();
    renderBoardWeeklyEdu();
    renderDocOpps();
    return;
  }

  const shifts = state.placements[dateKey] || {};

  // Group by role category
  const sections = [
    { label:'Unit Clerk', shifts: UC_SHIFTS },
    { label:'RN', shifts: RN_LPN_SHIFTS },
    { label:'Team Nursing', special:'team3c' },
    { label:'LPN', shifts: RN_LPN_SHIFTS },
    { label:'Clinical Assistant', shifts: CA_SHIFTS },
  ];

  let html = '';
  sections.forEach(sec => {
    if (sec.special === 'team3c') {
      html += renderTeamNursingSection(dateKey);
      return;
    }
    const roleFilter = sec.label === 'Unit Clerk' ? 'UC' : sec.label === 'Clinical Assistant' ? 'CA' : sec.label;
    html += `<div style="margin-bottom:18px;">
      <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">${sec.label}</div>
      <div class="shift-grid">`;
    sec.shifts.forEach(shift => {
      // For RN/LPN: 0700-1900 is a merged display of 0700-1500 + 1500-1900
      const mergedShifts = (shift === '0700-1900' && (roleFilter === 'RN' || roleFilter === 'LPN'))
        ? ['0700-1500', '1500-1900']
        : [shift];

      const allPlaced = mergedShifts.flatMap(s => (shifts[s]||[]).filter(p => p.role === roleFilter));
      // Deduplicate by name — keep first occurrence
      const seenNames = new Set();
      const dedupedPlaced = allPlaced.filter(p => {
        if (seenNames.has(p.name)) return false;
        seenNames.add(p.name);
        return true;
      });
      // Sort: orientation staff go to the bottom of each shift group
      const placements = [
        ...dedupedPlaced.filter(p => !state.empOrientation[p.name]),
        ...dedupedPlaced.filter(p =>  state.empOrientation[p.name]),
      ];
      // Always show all shift columns (empty columns display with 0 count)
      const alwaysShow = true;
      if (placements.length === 0 && !alwaysShow) return;
      // For remove button we need the actual shift key each person is in
      const placementShiftMap = new Map();
      mergedShifts.forEach(s => (shifts[s]||[]).filter(p => p.role === roleFilter)
        .forEach(p => { if (!placementShiftMap.has(p.name)) placementShiftMap.set(p.name, s); }));
      const chargeKey = `${dateKey}|${shift}`;
      const chargeNurse = state.chargeNurses[chargeKey] || null;
      const shiftDisplayLabel = shift;
      html += `<div class="shift-block">
        <div class="shift-block-header">
          <span class="shift-time">${shiftDisplayLabel}</span>
          <span class="shift-count">${placements.length}</span>
        </div>
        <div class="shift-body">`;
      const fullArr = shifts[shift] || []; // kept for charge nurse lookup compatibility
      placements.forEach((p) => {
          const actualShift = placementShiftMap.get(p.name) || shift;
          const actualArr   = shifts[actualShift] || [];
          const originalIdx = actualArr.findIndex(x => x.name === p.name && x.role === p.role);
          const isCharge3B = chargeNurse === p.name;
          const isCharge3C = state.charge3C[chargeKey] === p.name;
          const s3c        = state.staff3C[chargeKey] || {};
          const is3CStaff  = s3c.rn1 === p.name || s3c.rn2 === p.name || s3c.lpn === p.name;
          const eduItems = getEduItems(p.name);
          const eduCount = eduItems.length;
          const eduBadge = eduCount > 0
            ? `<span title="📚 ${eduCount} pending education item${eduCount>1?'s':''}: ${eduItems.slice(0,3).join(' · ')}${eduCount>3?' +more':''}"
                style="background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.5);border-radius:10px;padding:1px 6px;font-size:11px;font-weight:700;color:var(--amber2);font-family:'IBM Plex Mono',monospace;cursor:help;flex-shrink:0;">📚 ${eduCount}</span>`
            : '';
          const isOrient = state.empOrientation[p.name] || false;
          const orientAssignKey = `${dateKey}|${shift}|${p.name}`;
          const orientPreceptor = isOrient && state.orientAssign && state.orientAssign[orientAssignKey]
            ? state.orientAssign[orientAssignKey].split(',')[0].trim() : '';
          const orientBadge = isOrient
            ? `<span style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.5);border-radius:10px;padding:1px 7px;font-size:11px;font-weight:700;color:var(--amber2);font-family:'IBM Plex Mono',monospace;flex-shrink:0;letter-spacing:0.3px;" title="${orientPreceptor ? 'Training with: '+orientPreceptor : 'No preceptor assigned'}">ORIENT${orientPreceptor ? ' → '+orientPreceptor : ' ⚠'}</span>`
            : '';
          const isAgencyStaff = !!(state.agencyDates[p.name]?.isAgency);
          const agencyBadge = isAgencyStaff
            ? `<span style="background:rgba(91,33,182,0.15);border:1px solid rgba(139,92,246,0.5);border-radius:10px;padding:1px 7px;font-size:11px;font-weight:700;color:var(--purple2);font-family:'IBM Plex Mono',monospace;flex-shrink:0;letter-spacing:0.3px;">AGENCY</span>`
            : '';
          const isRNLPN = roleFilter === 'RN' || roleFilter === 'LPN';
          const isCA    = roleFilter === 'CA';

          // RN/LPN: only show badge if actual start is 1100
          // Only badge: CA in 2230-0630 who also appears in 1430-1830 (12hr shift, ends 0300)
          const startsAt1430 = isCA && actualShift === '2230-0630'
            && (shifts['1430-1830']||[]).some(x => x.name === p.name && x.role === 'CA');
          const timeBadge = startsAt1430
            ? `<span title="Started 1430 — shift ends 03:00" style="background:rgba(14,116,144,0.15);border:1px solid rgba(14,116,144,0.4);border-radius:10px;padding:1px 7px;font-size:11px;font-weight:700;color:var(--teal2);font-family:'IBM Plex Mono',monospace;flex-shrink:0;">–03:00</span>`
            : '';
          html += `<div class="staff-row${isOrient?' orient-row':''}">
            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
              <span class="staff-name"${isOrient?' style="color:rgba(245,158,11,0.85);"':''}>${p.name}</span>
              ${isCharge3B ? '<span class="charge-badge">⭐ 3B CHARGE</span>' : ''}
              ${isCharge3C ? '<span class="charge-badge" style="background:rgba(139,92,246,0.2);color:var(--purple2);border:1px solid rgba(139,92,246,0.4);">⭐ 3C CHARGE</span>' : ''}
              ${is3CStaff  ? '<span class="charge-badge" style="background:rgba(91,33,182,0.15);color:var(--purple2);border:1px solid rgba(139,92,246,0.35);font-size:11px;">3C</span>' : ''}
              ${orientBadge}
              ${agencyBadge}
              ${timeBadge}
              ${eduBadge}
            </div>
            <div class="staff-actions">
              <button class="move-btn remove-btn" onclick="removeStaff('${dateKey}','${actualShift}',${originalIdx},'${roleFilter}')" title="Remove">✕</button>
            </div>
          </div>`;
      });
      html += `</div></div>`;
    });
    html += `</div></div>`;
  });

  bv.innerHTML = html;
  updateRatios();
  renderBoardCertAlerts();
  renderBoardCompAlerts();
  renderBoardMessages();
  renderBoardWeeklyEdu();
  renderDocOpps();
}
// Team Nursing (3C triad) — shows the 3C Charge, RN 1, RN 2, and LPN for each
// merged shift column on the Daily Staffing Board, between the RN and LPN sections.
function renderTeamNursingSection(dateKey) {
  let html = `<div style="margin-bottom:18px;">
    <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">🤝 Team Nursing <span style="font-size:11px;color:var(--text3);text-transform:none;letter-spacing:0;font-weight:400;">— 3C Triad</span></div>
    <div class="shift-grid">`;

  RN_LPN_SHIFTS.forEach(shift => {
    const mergedShifts = (shift === '0700-1900') ? ['0700-1500','1500-1900'] : [shift];
    const primaryKey = `${dateKey}|${mergedShifts[0]}`;
    const charge3C = state.charge3C[primaryKey] || '';
    const s3c      = state.staff3C[primaryKey]  || {};

    const slots = [
      { slot:'charge', roleLabel:'3C CHARGE', name: charge3C, badgeStyle:'background:rgba(139,92,246,0.2);color:var(--purple2);border:1px solid rgba(139,92,246,0.4);' },
      { slot:'rn1',    roleLabel:'RN 1',       name: s3c.rn1 || '', badgeStyle:'background:rgba(46,125,209,0.15);color:var(--accent2);border:1px solid rgba(46,125,209,0.35);' },
      { slot:'rn2',    roleLabel:'RN 2',       name: s3c.rn2 || '', badgeStyle:'background:rgba(46,125,209,0.15);color:var(--accent2);border:1px solid rgba(46,125,209,0.35);' },
      { slot:'lpn',    roleLabel:'LPN',        name: s3c.lpn || '', badgeStyle:'background:rgba(91,33,182,0.15);color:var(--purple2);border:1px solid rgba(139,92,246,0.35);' },
    ].filter(s => s.name);

    html += `<div class="shift-block">
      <div class="shift-block-header">
        <span class="shift-time">${shift}</span>
        <span class="shift-count">${slots.length}</span>
      </div>
      <div class="shift-body">`;
    if (slots.length === 0) {
      html += `<div style="padding:10px 0;font-size:11px;color:var(--text3);text-align:center;">— Not yet assigned —</div>`;
    } else {
      slots.forEach(s => {
        html += `<div class="staff-row">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
            <span class="staff-name">${s.name}</span>
            <span class="charge-badge" style="${s.badgeStyle}">${s.slot === 'charge' ? '⭐ ' : ''}${s.roleLabel}</span>
          </div>
          <div class="staff-actions">
            <button class="move-btn remove-btn" onclick="clearTeam3CSlot('${primaryKey}','${s.slot}')" title="Clear">✕</button>
          </div>
        </div>`;
      });
    }
    html += `</div></div>`;
  });

  html += `</div></div>`;
  return html;
}

function clearTeam3CSlot(key, slot) {
  if (slot === 'charge') {
    state.charge3C[key] = '';
  } else {
    if (!state.staff3C[key]) state.staff3C[key] = {};
    state.staff3C[key][slot] = '';
  }
  persistSave();
  renderBoard();
  renderCharge();
}

// Auto-assign the first available LPN on shift as the 3C LPN, for shifts that
// don't already have one set. Mirrors the "always RN charge" auto-assign pattern.
function autoAssignLPN3C() {
  const dateKey = state.activeChargeDate || state.activeBoardDate;
  if (!dateKey) return;
  const shifts = state.placements[dateKey] || {};
  const nursingShifts = ['0700-1500','1500-1900','1900-0700'];
  let assignedCount = 0;
  nursingShifts.forEach(shift => {
    const chargeKey = `${dateKey}|${shift}`;
    const charge3B  = state.chargeNurses[chargeKey] || '';
    const charge3C  = state.charge3C[chargeKey]     || '';
    if (!state.staff3C[chargeKey]) state.staff3C[chargeKey] = {};
    if (state.staff3C[chargeKey].lpn) return; // already assigned — don't overwrite
    const lpnPool = (shifts[shift]||[]).filter(p => p.role === 'LPN' && p.name !== charge3B && p.name !== charge3C);
    if (lpnPool.length) {
      state.staff3C[chargeKey].lpn = lpnPool[0].name;
      assignedCount++;
    }
  });
  persistSave();
  renderCharge();
  renderBoard();
  showSaveBanner(assignedCount ? `🏥 Assigned first LPN to 3C for ${assignedCount} shift${assignedCount>1?'s':''}` : `No unassigned LPN slots to fill`);
}

function removeStaff(dateKey, shift, idx, role) {
  if (!state.placements[dateKey]) return;
  const arr = (state.placements[dateKey][shift]||[]).filter(p=>p.role===role);
  const target = arr[idx];
  if (!target) return;
  const fullArr = state.placements[dateKey][shift];
  const fi = fullArr.findIndex((p,i) => p.role===role && p.name===target.name && i >= (fullArr.findIndex(x=>x.role===role)));
  // remove first matching
  let removed = false;
  state.placements[dateKey][shift] = fullArr.filter((p,i) => {
    if (!removed && p.role===role && p.name===target.name) { removed=true; return false; }
    return true;
  });
  renderBoard();
  renderDirectory();
}

function addStaffManual() {
  const name = document.getElementById('add-name').value.trim();
  const role = document.getElementById('add-role').value;
  const shift = document.getElementById('add-shift').value;
  const dateKey = state.activeBoardDate;
  if (!name || !dateKey) return;
  if (!state.placements[dateKey]) state.placements[dateKey] = {};
  if (!state.placements[dateKey][shift]) state.placements[dateKey][shift] = [];
  state.placements[dateKey][shift].push({name, role});
  document.getElementById('add-name').value = '';
  renderBoard();
  renderDirectory();
}

function buildStaffDatalist() {
  const dl = document.getElementById('staff-datalist');
  dl.innerHTML = MASTER_STAFF.map(s=>`<option value="${s.name}">`).join('');
}

// ════════════════════════════════════
//  CHARGE NURSE
// ════════════════════════════════════
function initCharge() {
  state.activeChargeDate = state.dates[0] || null;
  renderChargeDateTabs();
  renderCharge();
  // Restore checkbox state
  const cb = document.getElementById('always-rn-charge');
  if (cb) cb.checked = state.alwaysRNCharge || false;
}

function renderChargeDateTabs() {
  buildDateTabs('charge-date-tabs', state.activeChargeDate, 'selectChargeDate', renderCharge);
}

function selectChargeDate(d) {
  state.activeChargeDate = d;
  renderChargeDateTabs();
  renderCharge();
}

function renderCharge() {
  const dateKey = state.activeChargeDate;
  const cont = document.getElementById('charge-assignments');
  if (!dateKey) { cont.innerHTML = '<div class="card" style="color:var(--text3);text-align:center;padding:30px;">No data loaded</div>'; return; }

  const shifts = state.placements[dateKey] || {};
  const nursingShifts = [
    { key: '0700-1500', label: '0700–1500', name: 'Day' },
    { key: '1500-1900', label: '1500–1900', name: 'Evening' },
    { key: '1900-0700', label: '1900–0700', name: 'Night' },
  ];

  // ── CHARGE NURSE SECTION ──
  let html = `
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">⭐ Charge Nurse Assignments</div>
    <div style="display:grid;grid-template-columns:90px 1fr 1fr;gap:6px;padding:0 14px 8px;margin-bottom:4px;">
      <div></div>
      <div style="font-size:11px;font-weight:700;color:var(--accent2);text-align:center;letter-spacing:0.5px;">🏥 3B CHARGE</div>
      <div style="font-size:11px;font-weight:700;color:var(--purple2);text-align:center;letter-spacing:0.5px;">🏥 3C CHARGE</div>
    </div>`;

  nursingShifts.forEach(({key: shift, label, name}) => {
    const rns       = (shifts[shift]||[]).filter(p => p.role === 'RN' || p.role === 'LPN');
    const chargeKey = `${dateKey}|${shift}`;
    const current3B = state.chargeNurses[chargeKey] || '';
    const current3C = state.charge3C[chargeKey]     || '';
    const rns3C     = rns.filter(r => r.name !== current3B);

    html += `<div class="charge-row">
      <div class="charge-shift-label">${label}<br><span style="font-size:11px;color:var(--text3);font-weight:400;">${name}</span></div>
      <div class="charge-unit-col">
        <select class="charge-select" onchange="setCharge3B('${chargeKey}',this.value)">
          <option value="">— Select 3B Charge —</option>
          ${(state.alwaysRNCharge ? rns.filter(r=>r.role==='RN') : rns).map(r=>`<option value="${r.name}" ${r.name===current3B?'selected':''}>${r.name} (${r.role})</option>`).join('')}
        </select>
        ${current3B ? `<span class="charge-indicator">⭐ ${current3B.split(',')[0].trim()}</span>` : ''}
      </div>
      <div class="charge-unit-col">
        <select class="charge-select" style="border-color:rgba(139,92,246,0.4);" onchange="setCharge3C('${chargeKey}',this.value)">
          <option value="">— Select 3C Charge —</option>
          ${rns3C.map(r=>`<option value="${r.name}" ${r.name===current3C?'selected':''}>${r.name} (${r.role})</option>`).join('')}
        </select>
        ${current3C ? `<span class="charge-indicator ind-3c">⭐ ${current3C.split(',')[0].trim()}</span>` : ''}
      </div>
    </div>`;
  });

  // ── 3C STAFFING SECTION ──
  html += `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:18px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;">🏥 3C Staff Assignments</div>
      <button class="btn btn-ghost btn-sm" onclick="autoAssignLPN3C()" title="Fill any unassigned 3C LPN slot with the first available LPN on that shift">⚡ Auto-Assign First LPN</button>
    </div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:10px;">Designate LPN and up to 2 RNs working on 3C per shift</div>`;

  nursingShifts.forEach(({key: shift, label, name}) => {
    const rns        = (shifts[shift]||[]).filter(p => p.role === 'RN' || p.role === 'LPN');
    const chargeKey  = `${dateKey}|${shift}`;
    const charge3B   = state.chargeNurses[chargeKey] || '';
    const charge3C   = state.charge3C[chargeKey]     || '';
    const s3c        = state.staff3C[chargeKey]      || {};

    const curLPN = s3c.lpn  || '';
    const curRN1 = s3c.rn1  || '';
    const curRN2 = s3c.rn2  || '';

    // Available pool: scheduled RNs/LPNs, exclude 3B and 3C charge nurses
    const pool = rns.filter(r => r.name !== charge3B && r.name !== charge3C);

    // LPN pool: LPNs only from pool
    const lpnPool = pool.filter(r => r.role === 'LPN');
    // RN pool: RNs only from pool, exclude selected LPN for RN dropdowns
    const rnPool  = pool.filter(r => r.role === 'RN');

    // For RN1/RN2 exclude each other's current selection
    const rn1Pool = rnPool.filter(r => r.name !== curRN2);
    const rn2Pool = rnPool.filter(r => r.name !== curRN1);

    html += `
      <div class="charge-row" style="grid-template-columns:90px 1fr 1fr 1fr;">
        <div class="charge-shift-label">${label}<br><span style="font-size:11px;color:var(--text3);font-weight:400;">${name}</span></div>

        <!-- LPN -->
        <div class="charge-unit-col">
          <div style="font-size:11px;font-weight:700;color:var(--purple2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">LPN</div>
          <select class="charge-select" style="border-color:rgba(91,33,182,0.4);" onchange="setStaff3C('${chargeKey}','lpn',this.value)">
            <option value="">— Select LPN —</option>
            ${lpnPool.length === 0 ? `<option disabled style="color:var(--text3);">No LPN on shift</option>` : ''}
            ${lpnPool.map(r=>`<option value="${r.name}" ${r.name===curLPN?'selected':''}>${r.name}</option>`).join('')}
          </select>
          ${curLPN ? `<span class="charge-indicator ind-3c" style="font-size:11px;">${curLPN.split(',')[0].trim()}</span>` : ''}
        </div>

        <!-- RN 1 -->
        <div class="charge-unit-col">
          <div style="font-size:11px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">RN 1</div>
          <select class="charge-select" onchange="setStaff3C('${chargeKey}','rn1',this.value)">
            <option value="">— Select RN —</option>
            ${rn1Pool.map(r=>`<option value="${r.name}" ${r.name===curRN1?'selected':''}>${r.name}</option>`).join('')}
          </select>
          ${curRN1 ? `<span class="charge-indicator" style="font-size:11px;">${curRN1.split(',')[0].trim()}</span>` : ''}
        </div>

        <!-- RN 2 -->
        <div class="charge-unit-col">
          <div style="font-size:11px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">RN 2</div>
          <select class="charge-select" onchange="setStaff3C('${chargeKey}','rn2',this.value)">
            <option value="">— Select RN —</option>
            ${rn2Pool.map(r=>`<option value="${r.name}" ${r.name===curRN2?'selected':''}>${r.name}</option>`).join('')}
          </select>
          ${curRN2 ? `<span class="charge-indicator" style="font-size:11px;">${curRN2.split(',')[0].trim()}</span>` : ''}
        </div>
      </div>`;
  });

  // ── ORIENTATION ASSIGNMENTS SECTION ──────────────────────────
  // Collect all orientation staff scheduled today across all nursing shifts
  const allOrientees = [];
  nursingShifts.forEach(({key: shift}) => {
    const placed = (shifts[shift] || []).filter(p =>
      (p.role === 'RN' || p.role === 'LPN') && state.empOrientation[p.name]
    );
    placed.forEach(p => {
      if (!allOrientees.find(o => o.name === p.name && o.shift === shift)) {
        allOrientees.push({ name: p.name, role: p.role, shift });
      }
    });
  });

  if (allOrientees.length > 0) {
    html += `
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-top:22px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">
        🎓 Orientation Assignments
      </div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:10px;">Assign which staff member each orientee will train with today</div>`;

    allOrientees.forEach(({ name: orientee, role, shift }) => {
      const assignKey = `${dateKey}|${shift}|${orientee}`;
      const current   = (state.orientAssign || {})[assignKey] || '';

      // Preceptor pool: same-shift RN/LPN, not on orientation themselves, exclude the orientee
      const preceptorPool = (shifts[shift] || []).filter(p =>
        (p.role === 'RN' || p.role === 'LPN') &&
        !state.empOrientation[p.name] &&
        p.name !== orientee
      );

      // Highlight certified preceptors
      const poolHtml = preceptorPool.map(p => {
        const isCert = !!(state.empPreceptor && state.empPreceptor[p.name]);
        const label  = isCert ? `${p.name} (${p.role}) 🎓` : `${p.name} (${p.role})`;
        return `<option value="${p.name}" ${p.name === current ? 'selected' : ''}>${label}</option>`;
      }).join('');

      const shiftLabel = nursingShifts.find(s => s.key === shift)?.label || shift;

      html += `
        <div style="display:grid;grid-template-columns:1fr 24px 1fr;align-items:center;gap:10px;padding:8px 14px;margin-bottom:6px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.25);border-radius:8px;">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--amber2);">ORIENT · ${shiftLabel}</div>
            <div style="font-size:12px;font-weight:600;color:var(--white);margin-top:2px;">${orientee}</div>
            <div style="font-size:11px;color:var(--text3);">${role}</div>
          </div>
          <div style="text-align:center;font-size:16px;color:var(--text3);">→</div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Training With</div>
            <select class="charge-select" style="border-color:rgba(245,158,11,0.45);"
              onchange="setOrientAssign('${dateKey}','${shift}','${orientee.replace(/'/g,"\'")}',this.value)">
              <option value="">— Unassigned —</option>
              ${poolHtml}
            </select>
            ${current ? `<span class="charge-indicator" style="background:rgba(245,158,11,0.15);color:var(--amber2);border-color:rgba(245,158,11,0.35);margin-top:4px;">🎓 ${current.split(',')[0].trim()}</span>` : ''}
          </div>
        </div>`;
    });

    html += `<div style="font-size:11px;color:var(--text3);padding:0 14px;margin-top:4px;">🎓 = Certified Preceptor</div>`;
  }

  // ACLS eligibility comes from the employee's Education certification expiry date.
  // An empty, malformed or expired ACLS record never qualifies for the medication/defib role.
  html += '<div style="font-weight:700;margin:20px 0 8px;color:var(--accent2)">🚨 Code Response Team</div>';
  ['DAY','NIGHT'].forEach(period => {
    const keys = period==='DAY' ? ['0700-1500','1500-1900','0630-1430','1430-1830','1830-2230'] : ['1900-0700','2230-0630'];
    const staff=[...new Map(keys.flatMap(k=>shifts[k]||[]).filter(p=>['RN','LPN','CA'].includes(p.role)).map(p=>[p.name,p])).values()].sort((a,b)=>a.name.localeCompare(b.name));
    const team=(state.codeResponseTeam||{})[dateKey+'|'+period]||{};
    html+='<div class="card"><b>'+period+'</b><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:8px;">';
    [['primary','Primary RN'],['meddefib','Medication / Defibrillator RN'],['compressions1','Compressions 1'],['compressions2','Compressions 2'],['recorder','RN Recorder']].forEach(([role,label])=>{
      html+='<label>'+label+'<select class="charge-select" style="width:100%" onchange="setCodeResponseTeam('+JSON.stringify(dateKey+'|'+period)+','+JSON.stringify(role)+',this.value)"><option value="">— Unassigned —</option>'+
        staff.filter(p=>(!['primary','meddefib','recorder'].includes(role)||p.role==='RN') && (role!=='meddefib'||codeHasCurrentACLS(p.name))).map(p=>'<option value="'+ccEsc(p.name)+'" '+(team[role]===p.name?'selected':'')+'>'+ccEsc(p.name)+' ('+p.role+')</option>').join('')+'</select></label>';
    });
    if (team.meddefib && !codeHasCurrentACLS(team.meddefib)) {
      html+='<div style="color:var(--red2);font-size:12px;margin-top:8px;">⚠ Medication / Defibrillator RN assignment is not valid: ACLS is missing or expired. Select a currently certified RN.</div>';
    }
    html+='</div></div>';
  });
  cont.innerHTML = html;
}
function codeHasCurrentACLS(name) {
  const expiry = String((state.certs && state.certs[name] && state.certs[name].ACLS) || '').trim();
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(expiry);
  if (!match) return false;
  const month = Number(match[1]), day = Number(match[2]), year = Number(match[3]);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  if (end.getFullYear() !== year || end.getMonth() !== month - 1 || end.getDate() !== day) return false;
  return end.getTime() >= Date.now();
}
function setCodeResponseTeam(key,role,name) {
  if (role === 'meddefib' && name && !codeHasCurrentACLS(name)) {
    alert('Medication / Defibrillator RN requires a current ACLS expiration date in the Education tab.');
    renderCharge();
    return;
  }
  state.codeResponseTeam ||= {};
  const team=state.codeResponseTeam[key] ||= {};
  if(name && Object.entries(team).some(([r,n])=>['primary','meddefib','compressions1','compressions2','recorder'].includes(r)&&r!==role&&n===name)){alert('Already assigned to another code role.');renderCharge();return;}
  team[role]=name;persistSave();renderCharge();
}
function setCharge3B(key, name) {
  state.chargeNurses[key] = name;
  // If the newly selected 3B charge was also the 3C charge, clear 3C
  if (name && state.charge3C[key] === name) {
    state.charge3C[key] = '';
  }
  persistSave();
  renderCharge();
  renderBoard();
}

function setOrientAssign(dateKey, shift, orienteeName, preceptorName) {
  if (!state.orientAssign) state.orientAssign = {};
  const key = `${dateKey}|${shift}|${orienteeName}`;
  state.orientAssign[key] = preceptorName;
  persistSave();
  renderCharge();
  renderBoard();
  showSaveBanner(`🎓 ${orienteeName.split(',')[0]} → ${preceptorName ? preceptorName.split(',')[0] : 'unassigned'}`);
}

function toggleDbl(name, val) {
  if (!state.empDbl) state.empDbl = {};
  if (!state.empDbl[name]) state.empDbl[name] = {};
  state.empDbl[name].onLeave = val;
  if (!val) {
    delete state.empDbl[name].startDate;
    delete state.empDbl[name].returnDate;
    if (!Object.keys(state.empDbl[name]).length) delete state.empDbl[name];
  }
  persistSave();
  renderDirectory();
  renderVacancy();
  showSaveBanner(`💾 DBL/Maternity ${val ? 'enabled' : 'removed'} for ${name.split(',')[0]}`);
}

function saveDbl(name, field, val) {
  if (!state.empDbl) state.empDbl = {};
  if (!state.empDbl[name]) state.empDbl[name] = {};
  state.empDbl[name][field] = val;
  persistSave();
}

function toggleAlwaysCharge(name, checked) {
  if (checked) {
    state.empAlwaysCharge[name] = true;
  } else {
    delete state.empAlwaysCharge[name];
  }
  persistSave();
  renderDirectory();
  // Auto-apply to current board date if they're working today
  autoApplyAlwaysCharge();
  renderBoard();
  renderCharge();
}

// Apply empAlwaysCharge flags to current date's charge assignments
function autoApplyAlwaysCharge() {
  const dateKey = state.activeBoardDate;
  if (!dateKey) return;
  const placements = state.placements[dateKey] || {};
  Object.entries(placements).forEach(([shift, staffList]) => {
    // Check if any always-charge RN is in this shift
    const chargeKey = dateKey + '|' + shift;
    const alwaysChargeInShift = (staffList || []).find(p =>
      p.role === 'RN' && state.empAlwaysCharge[p.name]
    );
    if (alwaysChargeInShift && !state.chargeNurses[chargeKey]) {
      state.chargeNurses[chargeKey] = alwaysChargeInShift.name;
    }
  });
  persistSave();
}

function toggleAlwaysRNCharge(checked) {
  state.alwaysRNCharge = checked;
  persistSave();
  if (checked) autoAssignRNCharges();
  renderCharge();
  renderBoard();
}

// Auto-assign charge: for each shift on active date, pick first available RN
function autoAssignRNCharges() {
  const dateKey = state.activeChargeDate || state.activeBoardDate;
  if (!dateKey) return;
  const shifts = ['DAY','EVE1','EVE2','NIGHT'];
  shifts.forEach(shift => {
    const key = dateKey + '|' + shift;
    const placements = state.placements[dateKey] || {};
    const shiftStaff = placements[shift] || [];
    // Find first RN in that shift
    const rn = shiftStaff.find(p => p.role === 'RN');
    if (rn && !state.chargeNurses[key]) {
      state.chargeNurses[key] = rn.name;
    }
  });
  persistSave();
}

function setCharge3C(key, name) {
  state.charge3C[key] = name;
  persistSave();
  renderCharge();
  renderBoard();
}

function setStaff3C(key, slot, name) {
  if (!state.staff3C[key]) state.staff3C[key] = {};
  state.staff3C[key][slot] = name;
  persistSave();
  renderCharge();
  renderBoard();
}

// Keep old setCharge as alias for backward compat
function setCharge(key, name) { setCharge3B(key, name); }

// ════════════════════════════════════
//  DIRECTORY
// ════════════════════════════════════
function getWorkingToday() {
  const dateKey = state.activeBoardDate || state.dates[0];
  if (!dateKey || !state.placements[dateKey]) return new Set();
  return new Set(Object.values(state.placements[dateKey]).flat().map(p=>p.name));
}

// ── Directory sub-tab switchers (shift/status + role are independent, combined with AND) ──
function setDirShiftTab(el) {
  document.querySelectorAll('#dir-shift-tabs .dir-subtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  state.dirShiftTab = el.dataset.dirshift;
  renderDirectory();
}
function setDirRoleTab(el) {
  document.querySelectorAll('#dir-role-tabs .dir-subtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  state.dirRoleTab = el.dataset.dirrole;
  renderDirectory();
}

// ── Vacancy Rate ──
// Agency activity uses the current calendar week (Sunday–Saturday), independent of board date.
function vacancyAgencyWeek(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  const today = new Date(Date.UTC(+part('year'), +part('month') - 1, +part('day')));
  const start = new Date(today); start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);
  return {start, end};
}
function vacancyAgencyStatus(name, week = vacancyAgencyWeek()) {
  const agency = state.agencyDates?.[name];
  if (!agency?.isAgency) return 'staff';
  const parse = value => {
    const text = String(value || '').trim();
    let m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/), y, mo, d;
    if (m) { y=+m[1]; mo=+m[2]; d=+m[3]; }
    else { m=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/); if (!m) return null; y=+m[3]; if(y<100)y+=2000; mo=+m[1]; d=+m[2]; }
    const date = new Date(Date.UTC(y,mo-1,d));
    return date.getUTCFullYear()===y && date.getUTCMonth()===mo-1 && date.getUTCDate()===d ? date : null;
  };
  const start = parse(agency.contractStart), end = parse(agency.extensionEnd || agency.contractEnd);
  if (!start || !end || end < start) return 'unknown';
  return start <= week.end && end >= week.start ? 'active' : 'inactive';
}
function getStaffOnShift(role, shifts) {
  const dayShiftKeys = role==='CA' ? ['0630-1430','0630-1830'] : ['0700-1500'];
  const eveShiftKeys = role==='CA' ? ['1430-1830','1830-2230','1430-0300'] : ['1500-1900'];
  const ngtShiftKeys = role==='CA' ? ['2230-0630','1830-0630'] : ['1900-0700'];

  // Use FTE values instead of headcount
  function getFTE(name) {
    const value = Number.parseFloat(state.empFTE[name]);
    return Number.isFinite(value) ? value : 1.0;
  }

  const dayNames = new Set();
  const eveNames = new Set();
  const ngtNames = new Set();

  dayShiftKeys.forEach(s => (shifts[s]||[]).filter(p=>p.role===role).forEach(p=>dayNames.add(p.name)));
  eveShiftKeys.forEach(s => (shifts[s]||[]).filter(p=>p.role===role).forEach(p=>eveNames.add(p.name)));
  ngtShiftKeys.forEach(s => (shifts[s]||[]).filter(p=>p.role===role).forEach(p=>ngtNames.add(p.name)));

  // Also count staff with empShifts designation
  MASTER_STAFF.filter(s => s.job === role).forEach(s => {
    const sh    = state.empShifts[s.name];
    const hours = role === 'CA' ? (state.empCAHours[s.name] || '') : '';
    if (sh === 'DAY'  || sh === 'BOTH') {
      if (!hours || hours === '8')  dayNames.add(s.name);
      if (hours === '12')           dayNames.add(s.name);
    }
    if (sh === 'EVE'  || sh === 'BOTH') eveNames.add(s.name);
    if (sh === 'NIGHT'|| sh === 'BOTH') {
      if (!hours || hours === '8')  ngtNames.add(s.name);
      if (hours === '12')           ngtNames.add(s.name);
    }
  });

  const week = vacancyAgencyWeek();
  [dayNames, eveNames, ngtNames].forEach(names => {
    names.forEach(name => { if (state.agencyDates?.[name]?.isAgency && vacancyAgencyStatus(name, week) !== 'active') names.delete(name); });
  });
  const allNames = new Set([...dayNames, ...eveNames, ...ngtNames]);
  // Active agency nurses count in total RN FTE even before a shift is assigned.
  if (role === 'RN') MASTER_STAFF.filter(s => s.job === 'RN' && vacancyAgencyStatus(s.name, week) === 'active').forEach(s => allNames.add(s.name));

  // Sum FTE values — round to 1 decimal for display
  function sumFTE(nameSet) {
    return Math.round([...nameSet].reduce((sum, name) => sum + getFTE(name), 0) * 10) / 10;
  }

  return {
    day:   sumFTE(dayNames),
    eve:   sumFTE(eveNames),
    night: sumFTE(ngtNames),
    total: sumFTE(allNames),
  };
}

function renderVacancy() {
  const dateKey = state.activeBoardDate || state.dates[0];
  const shifts  = dateKey ? (state.placements[dateKey] || {}) : {};

  // ── Working Budget vs Full Budget ─────────────────────────────
  const budgetSplitEl = document.getElementById('budget-split-summary');
  if (budgetSplitEl) {
    const roles = ['RN','LPN','CA'];
    const counts = { working:{RN:0,LPN:0,CA:0}, full:{RN:0,LPN:0,CA:0}, dbl:{RN:0,LPN:0,CA:0}, orient:{RN:0,LPN:0,CA:0} };

    MASTER_STAFF.forEach(s => {
      if (!roles.includes(s.job)) return;
      const onDbl    = !!(state.empDbl?.[s.name]?.onLeave);
      const onOrient = !!(state.empOrientation?.[s.name]);
      counts.full[s.job]++;
      if (onDbl)    counts.dbl[s.job]++;
      if (onOrient) counts.orient[s.job]++;
      if (!onDbl && !onOrient && ['staff','active'].includes(vacancyAgencyStatus(s.name))) counts.working[s.job]++;
    });

    const total = (obj) => Object.values(obj).reduce((a,b)=>a+b,0);
    const wTotal = total(counts.working);
    const fTotal = total(counts.full);
    const dTotal = total(counts.dbl);
    const oTotal = total(counts.orient);

    const roleRow = (label, cls, role) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span class="tag tag-${cls}" style="font-size:11px;">${label}</span>
        <span style="font-size:12px;font-weight:700;color:var(--white);">${counts.working[role]}</span>
      </div>`;
    const roleRowFull = (label, cls, role) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span class="tag tag-${cls}" style="font-size:11px;">${label}</span>
        <span style="font-size:12px;font-weight:700;color:var(--white);">${counts.full[role]}</span>
      </div>`;

    budgetSplitEl.innerHTML = `
      <div style="background:rgba(37,168,104,0.08);border:1px solid rgba(37,168,104,0.3);border-radius:10px;padding:14px;">
        <div style="font-size:11px;font-weight:700;color:var(--green2);margin-bottom:2px;">💼 Available staff</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:10px;">Staff count · excludes leave and orientation</div>
        ${roleRow('RN','rn','RN')}${roleRow('LPN','lpn','LPN')}${roleRow('CA','ca','CA')}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;margin-top:4px;">
          <span style="font-size:11px;font-weight:700;color:var(--white);">Total</span>
          <span style="font-size:16px;font-weight:700;color:var(--green2);">${wTotal}</span>
        </div>
        ${dTotal>0?`<div style="font-size:11px;color:var(--purple2);margin-top:4px;">🤱 ${dTotal} on DBL/Maternity</div>`:''}
        ${oTotal>0?`<div style="font-size:11px;color:var(--amber2);">🎓 ${oTotal} in Orientation</div>`:''}
      </div>
      <div style="background:rgba(46,125,209,0.08);border:1px solid rgba(46,125,209,0.3);border-radius:10px;padding:14px;">
        <div style="font-size:11px;font-weight:700;color:var(--accent2);margin-bottom:2px;">👥 Total roster</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:10px;">Staff count · includes leave and orientation</div>
        ${roleRowFull('RN','rn','RN')}${roleRowFull('LPN','lpn','LPN')}${roleRowFull('CA','ca','CA')}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;margin-top:4px;">
          <span style="font-size:11px;font-weight:700;color:var(--white);">Total</span>
          <span style="font-size:16px;font-weight:700;color:var(--accent2);">${fTotal}</span>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px;">
          ${dTotal>0?`🤱 ${dTotal} DBL/Mat · `:''}${oTotal>0?`🎓 ${oTotal} Orient · `:''}${wTotal} active
        </div>
      </div>`;
  }

  const agencyWeek = vacancyAgencyWeek();
  const agencyNurses = MASTER_STAFF.filter(s => s.job === 'RN' && state.agencyDates?.[s.name]?.isAgency);
  const activeAgency = agencyNurses.filter(s => vacancyAgencyStatus(s.name, agencyWeek) === 'active');
  const unknownAgency = agencyNurses.filter(s => vacancyAgencyStatus(s.name, agencyWeek) === 'unknown');
  let agencySummary = document.getElementById('vacancy-agency-summary');
  if (!agencySummary && budgetSplitEl) {
    agencySummary = document.createElement('div'); agencySummary.id = 'vacancy-agency-summary';
    agencySummary.className = 'vacancy-extra'; budgetSplitEl.after(agencySummary);
  }
  if (agencySummary) {
    const fmt = date => date.toLocaleDateString('en-US', {timeZone:'UTC',month:'short',day:'numeric'});
    const fte = activeAgency.reduce((sum, s) => { const value = Number.parseFloat(state.empFTE[s.name]); return sum + (Number.isFinite(value) ? value : 1); }, 0);
    agencySummary.innerHTML = '<strong>Agency RNs · active this week: ' + activeAgency.length + '</strong>' +
      '<div class="vacancy-help" style="margin:8px 0 0;">' + fmt(agencyWeek.start) + ' – ' + fmt(agencyWeek.end) + ' (Sun–Sat) · ' + fte.toFixed(1) + ' FTE included in total RN filled FTE. Counts assignments overlapping any day this week; extensions use the latest saved end date.</div>' +
      (unknownAgency.length ? '<div class="vacancy-help" style="margin:8px 0 0;">' + unknownAgency.length + ' agency RN(s) need valid start and end dates before they can be counted as active.</div>' : '');
  }

  const roleRows = [
    { role:'RN',  prefix:'rn',  periods:['total','day','ngt'] },
    { role:'LPN', prefix:'lpn', periods:['total','day','ngt'] },
    { role:'CA',  prefix:'ca',  periods:['total','day','eve','ngt'] },
  ];

  let hasOverBudget = false;
  let totalVacant = 0, totalBudget = 0;
  const summaryBadges = [];

  roleRows.forEach(({ role, prefix, periods }) => {
    const counts = getStaffOnShift(role, shifts);

    periods.forEach(period => {
      const budgetEl = document.getElementById(`vac-${prefix}-${period}-budget`);
      const filledEl = document.getElementById(`vac-${prefix}-${period}-filled`);
      const vacantEl = document.getElementById(`vac-${prefix}-${period}-vacant`);
      const pctEl    = document.getElementById(`vac-${prefix}-${period}-pct`);
      if (!filledEl) return;

      const budgetVal = budgetEl?.value ? parseInt(budgetEl.value) : null;
      if (budgetEl?.value) {
        if (!state.vacancyBudgets) state.vacancyBudgets = {};
        state.vacancyBudgets[`${prefix}-${period}`] = parseInt(budgetEl.value);
        persistSave();
      }

      const filledKey = period === 'total' ? 'total' : period === 'day' ? 'day' : period === 'eve' ? 'eve' : 'night';
      const filled = counts[filledKey] || 0;
      filledEl.textContent = filled;

      const cell = filledEl.closest('.vacancy-cell');

      if (budgetVal) {
        const diff   = Math.round((budgetVal - filled) * 10) / 10; // positive = vacant, negative = over budget
        const isOver = diff < 0;
        const pct    = Math.abs((diff / budgetVal) * 100).toFixed(0);

        if (period === 'total') {
          totalBudget += budgetVal;
          if (!isOver) totalVacant += diff;
          summaryBadges.push({ role, period, filled, budgetVal, diff, isOver });
        }

        if (isOver) {
          hasOverBudget = true;
          vacantEl.textContent = `${Math.abs(diff).toFixed(1)} over`;
          vacantEl.className   = 'vacancy-num vacancy-over';
          pctEl.textContent    = pct + '% Over';
          pctEl.className      = 'vacancy-num vacancy-over';
          if (cell) cell.style.background = 'rgba(179,35,24,0.15)';
        } else {
          vacantEl.textContent = diff === 0 ? 'On budget' : `${diff.toFixed(1)} open`;
          pctEl.textContent    = pct + '%';
          const cls = pct >= 20 ? 'vacancy-red' : pct >= 10 ? 'vacancy-amber' : 'vacancy-green';
          vacantEl.className   = `vacancy-num ${cls}`;
          pctEl.className      = `vacancy-num ${cls}`;
          if (cell) cell.style.background = '';
        }
      } else {
        vacantEl.textContent = '—'; pctEl.textContent = '—';
        vacantEl.className = 'vacancy-num'; pctEl.className = 'vacancy-num';
        if (cell) cell.style.background = '';
      }
    });
  });

  // Update panel border for over-budget
  const panel = document.getElementById('vacancy-panel');
  if (panel) panel.className = `vacancy-panel${hasOverBudget ? ' has-overbudget' : ''}`;

  // Summary badges
  const badgesEl = document.getElementById('vacancy-summary-badges');
  if (badgesEl) {
    badgesEl.innerHTML = summaryBadges.map(b => {
      const isOver = b.diff < 0;
      const pct    = Math.abs(((b.diff) / b.budgetVal) * 100).toFixed(0);
      const color  = isOver ? 'var(--red2)' : b.diff <= 1 ? 'var(--amber2)' : 'var(--green2)';
      const bg     = isOver ? 'rgba(179,35,24,0.15)' : b.diff <= 1 ? 'rgba(180,83,9,0.12)' : 'rgba(26,122,74,0.1)';
      const label  = isOver ? `🔴 ${b.role} OVER by ${Math.abs(b.diff).toFixed(1)}` : `${b.diff === 0 ? '🟡' : '🟢'} ${b.role}: ${b.diff.toFixed(1)} FTE open`;
      return `<span style="padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;color:${color};background:${bg};font-family:'IBM Plex Mono',monospace;">${label}</span>`;
    }).join('');
  }

  // 6-Week Forecast
  renderVacancyForecast(shifts);
}

function buildForecastPrintHtml() {
  // Builds the 6-week forecast as a print-friendly HTML string
  const today = new Date(); today.setHours(0,0,0,0);

  function parseDate(str) {
    if (!str) return null;
    const p = str.toString().split('/');
    if (p.length < 3) return null;
    const yr = parseInt(p[2]), mo = parseInt(p[0]), dy = parseInt(p[1]);
    if (!yr || !mo || !dy) return null;
    const fullYr = yr < 100 ? 2000 + yr : yr;
    const d = new Date(fullYr, mo - 1, dy);
    return isNaN(d.getTime()) ? null : d;
  }
  function fmtDate(d) { return d ? `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear().toString().slice(2)}` : ''; }
  function fmtDateLong(d) { return d ? d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : ''; }

  const weeks = Array.from({length:6}, (_,w) => {
    const s = new Date(today); s.setDate(today.getDate() + w*7);
    const e = new Date(s); e.setDate(s.getDate()+6);
    return { start:s, end:e, contracts:[], certs:[] };
  });

  const budgets = state.vacancyBudgets || {};
  const roleKeys = ['RN','LPN','CA'];
  const departing = { RN:[0,0,0,0,0,0], LPN:[0,0,0,0,0,0], CA:[0,0,0,0,0,0] };

  const CERT_FIELDS = [
    {key:'acls',label:'ACLS'},{key:'bls',label:'BLS/CPR'},{key:'nihss',label:'NIHSS'},
    {key:'pivInsertion',label:'PIV'},{key:'bloodAdmin',label:'Blood Admin'},
    {key:'telemetry',label:'Telemetry'},{key:'ecgAcquisition',label:'12-Lead ECG'},
    {key:'tncc',label:'TNCC'},{key:'cen',label:'CEN'},{key:'pals',label:'PALS'},
    ...[1,2,3,4,5].map(n=>({key:`custom${n}_date`,label:`Custom ${n}`}))
  ];

  MASTER_STAFF.filter(s=>s.job!=='NURSE MGR').forEach(s => {
    const agency = state.agencyDates[s.name] || {};
    const certs  = state.certs[s.name] || {};
    const empShift = state.empShifts[s.name] || '';
    const shiftIcon = empShift==='DAY'?'☀️':empShift==='NIGHT'?'🌙':empShift==='BOTH'?'↔':'';

    ['contractEnd','extensionEnd'].forEach(field => {
      const d = parseDate(agency[field]);
      if (!d) return;
      weeks.forEach((wk,wi) => {
        if (d >= wk.start && d <= wk.end) {
          wk.contracts.push({name:s.name, role:s.job, type:field==='contractEnd'?'Contract End':'Extension End', date:agency[field], shift:shiftIcon});
          for (let fw=wi; fw<6; fw++) departing[s.job][fw]++;
        }
      });
    });

    CERT_FIELDS.forEach(({key,label}) => {
      const dt = certs[key];
      const d  = dt ? new Date(dt+'T12:00:00') : null;
      if (!d) return;
      const daysAway = Math.round((d-today)/86400000);
      if (daysAway < 0 || daysAway > 42) return;
      weeks.forEach((wk,wi) => {
        if (d >= wk.start && d <= wk.end)
          wk.certs.push({name:s.name,role:s.job,cert:label,date:dt,shift:shiftIcon,daysAway});
      });
    });
  });

  const activeShifts = (state.activeBoardDate ? state.placements[state.activeBoardDate] : null) || {};
  const baselineFilled = {
    RN:  getStaffOnShift('RN',  activeShifts).total,
    LPN: getStaffOnShift('LPN', activeShifts).total,
    CA:  getStaffOnShift('CA',  activeShifts).total,
  };

  const rColors = {RN:'#1d4ed8',LPN:'#7c3aed',CA:'#0e7490'};

  let rows = '';
  weeks.forEach((wk,wi) => {
    const isNow = wi === 0;
    const dateRange = `${fmtDate(wk.start)} – ${fmtDate(wk.end)}`;
    const weekLabel = isNow ? 'THIS WEEK' : `Week ${wi+1}`;
    const hasEvents = wk.contracts.length || wk.certs.length;

    let events = '';
    if (!hasEvents) {
      // Skip weeks with no events in the manager print
      return;
    } else {
      wk.contracts.forEach(ev => {
        events += `<div style="padding:2px 0;display:flex;align-items:center;gap:5px;">
          <span style="font-size:8pt;font-weight:700;padding:1px 5px;border-radius:3px;background:#fee2e2;color:#b91c1c;">CONTRACT</span>
          <span style="font-size:8pt;font-weight:700;color:${rColors[ev.role]};border:1px solid ${rColors[ev.role]};border-radius:3px;padding:1px 4px;">${ev.role}</span>
          ${ev.shift?`<span style="font-size:9pt;">${ev.shift}</span>`:''}
          <span style="font-weight:700;font-size:10pt;">${ev.name}</span>
          <span style="color:#6b7280;font-size:9pt;">${ev.type} · ${ev.date}</span>
        </div>`;
      });
      wk.certs.forEach(ev => {
        const urgBg  = ev.daysAway <= 7  ? '#fee2e2' : '#fef3c7';
        const urgCol = ev.daysAway <= 7  ? '#b91c1c' : '#b45309';
        events += `<div style="padding:2px 0;display:flex;align-items:center;gap:5px;">
          <span style="font-size:8pt;font-weight:700;padding:1px 5px;border-radius:3px;background:${urgBg};color:${urgCol};">${ev.cert}</span>
          <span style="font-size:8pt;font-weight:700;color:${rColors[ev.role]};border:1px solid ${rColors[ev.role]};border-radius:3px;padding:1px 4px;">${ev.role}</span>
          ${ev.shift?`<span style="font-size:9pt;">${ev.shift}</span>`:''}
          <span style="font-weight:700;font-size:10pt;">${ev.name}</span>
          <span style="color:#6b7280;font-size:9pt;">Exp: ${ev.date} · ${ev.daysAway}d</span>
        </div>`;
      });
    }

    let proj = roleKeys.map(role => {
      const budget = budgets[`${role.toLowerCase()}-total`] || null;
      if (!budget) return '';
      const dep    = departing[role]?.[wi] || 0;
      const filled = Math.round(Math.max(0, baselineFilled[role] - dep) * 10) / 10;
      const vacant = Math.round((budget - filled) * 10) / 10;
      const isOver = vacant < 0;
      const color  = isOver ? '#b91c1c' : vacant===0 ? '#b45309' : '#16a34a';
      const label  = isOver ? `+${Math.abs(vacant)} over` : `${vacant} open`;
      return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
        <span style="font-size:8pt;font-weight:700;color:${rColors[role]}">${role}</span>
        <span style="font-size:9pt;font-weight:700;color:${color};font-family:monospace;">${filled}/${budget} · ${label}</span>
      </div>`;
    }).filter(Boolean).join('') || '<span style="color:#9ca3af;font-size:9pt;">Enter budgets</span>';

    const rowBg = wk.contracts.length ? '#fff8f8' : wk.certs.length ? '#fffbeb' : '#fff';
    rows += `<tr style="background:${rowBg};${isNow?'font-weight:700;':''}">
      <td style="padding:7px 8px;border:1px solid #d1d5db;white-space:nowrap;font-size:9pt;font-weight:${isNow?'700':'400'};color:${isNow?'#1d4ed8':'#374151'};">${weekLabel}<br><span style="font-size:7.5pt;color:#9ca3af;font-weight:400;">${dateRange}</span></td>
      <td style="padding:7px 8px;border:1px solid #d1d5db;">${events}</td>
      <td style="padding:7px 8px;border:1px solid #d1d5db;min-width:150px;">${proj}</td>
    </tr>`;
  });

  return `
    <div style="font-size:12pt;font-weight:700;margin-bottom:6px;">📈 6-Week Forecast</div>
    <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
      <thead><tr style="background:#f0f0f0;">
        <th style="padding:6px 8px;border:1px solid #999;text-align:left;width:100px;">Week</th>
        <th style="padding:6px 8px;border:1px solid #999;text-align:left;">Departures &amp; Cert Expirations</th>
        <th style="padding:6px 8px;border:1px solid #999;text-align:left;width:170px;">Projected Vacancy (FTE)</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderVacancyForecast(shifts) {
  const el = document.getElementById('vacancy-forecast');
  if (!el) return;

  const today = new Date(); today.setHours(0,0,0,0);

  function parseDate(str) {
    if (!str) return null;
    const p = str.toString().split('/');
    if (p.length < 3) return null;
    const yr = parseInt(p[2]); const mo = parseInt(p[0]); const dy = parseInt(p[1]);
    if (!yr || !mo || !dy) return null;
    // Handle 2-digit year
    const fullYr = yr < 100 ? 2000 + yr : yr;
    const d = new Date(fullYr, mo - 1, dy);
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtDate(d) {
    return d ? `${d.getMonth()+1}/${d.getDate()}` : '';
  }

  // Build 6 week slots
  const weeks = Array.from({length: 6}, (_, w) => {
    const start = new Date(today); start.setDate(today.getDate() + w * 7);
    const end   = new Date(start); end.setDate(start.getDate() + 6);
    return { start, end, contracts: [], certs: [], callouts: [] };
  });

  const budgets = state.vacancyBudgets || {};
  const roleColors = { RN:'var(--accent2)', LPN:'var(--purple2)', CA:'var(--teal2)' };
  const roleBg     = { RN:'rgba(46,125,209,0.15)', LPN:'rgba(91,33,182,0.15)', CA:'rgba(14,116,144,0.15)' };

  // Track running vacancy delta per role per week (cumulative departures)
  const roleKeys = ['RN','LPN','CA'];
  const departing = { RN: [0,0,0,0,0,0], LPN: [0,0,0,0,0,0], CA: [0,0,0,0,0,0] };

  // Cert fields to track
  const CERT_FIELDS = [
    { key:'ACLS',       label:'ACLS'        },
    { key:'BLS',        label:'BLS'         },
    { key:'NIHSS',      label:'NIHSS'       },
    { key:'License',    label:'License'     },
    { key:'HealthEval', label:'Health Eval' },
    { key:'FitTest',    label:'Fit Test'    },
  ];

  MASTER_STAFF.filter(s => s.job !== 'NURSE MGR').forEach(s => {
    const agency   = state.agencyDates[s.name] || {};
    const certs    = state.certs[s.name] || {};
    const empShift = state.empShifts[s.name] || '';
    const shiftIcon = empShift === 'DAY' ? '☀️' : empShift === 'NIGHT' ? '🌙' : empShift === 'BOTH' ? '↔' : '';

    // Contract / extension end dates → budget departures
    ['contractEnd','extensionEnd'].forEach(field => {
      const d = parseDate(agency[field]);
      if (!d) return;
      weeks.forEach((wk, wi) => {
        if (d >= wk.start && d <= wk.end) {
          wk.contracts.push({ name: s.name, role: s.job, type: field === 'contractEnd' ? 'Contract End' : 'Extension End', date: agency[field], shift: shiftIcon });
          departing[s.job] = departing[s.job] || [0,0,0,0,0,0];
          for (let fw = wi; fw < 6; fw++) departing[s.job][fw]++;
        }
      });
    });

    // Cert expirations
    CERT_FIELDS.forEach(({ key, label }) => {
      const d = parseDate(certs[key]);
      if (!d) return;
      const daysAway = Math.round((d - today) / 86400000);
      if (daysAway < 0 || daysAway > 42) return;
      weeks.forEach((wk, wi) => {
        if (d >= wk.start && d <= wk.end) {
          wk.certs.push({ name: s.name, role: s.job, cert: label, date: certs[key], shift: shiftIcon, daysAway });
        }
      });
    });
  });

  // Current filled counts (baseline)
  const activeShifts = (state.activeBoardDate ? state.placements[state.activeBoardDate] : null) || {};
  const baselineFilled = {
    RN:  getStaffOnShift('RN',  activeShifts).total,
    LPN: getStaffOnShift('LPN', activeShifts).total,
    CA:  getStaffOnShift('CA',  activeShifts).total,
  };

  // Build table
  const hasAnyEvent = weeks.some(w => w.contracts.length || w.certs.length);

  let html = `<table class="forecast-table">
    <thead>
      <tr>
        <th style="width:90px;">Week</th>
        <th style="width:120px;">Dates</th>
        <th>Departures &amp; Cert Expirations</th>
        <th style="text-align:center;width:180px;">Projected Vacancy</th>
      </tr>
    </thead>
    <tbody>`;

  weeks.forEach((wk, wi) => {
    const isNow  = wi === 0;
    const dateRange = `${fmtDate(wk.start)} – ${fmtDate(wk.end)}`;
    const hasEvents = wk.contracts.length > 0 || wk.certs.length > 0;
    const rowBg  = wk.contracts.length ? 'rgba(179,35,24,0.06)' : wk.certs.length ? 'rgba(180,83,9,0.05)' : '';

    // Event HTML
    let eventHtml = '';
    if (!hasEvents) {
      eventHtml = `<span style="color:var(--green2);font-size:11px;">✓ No departures or expirations</span>`;
    } else {
      wk.contracts.forEach(ev => {
        eventHtml += `<div style="display:flex;align-items:center;gap:5px;padding:2px 0;">
          <span style="font-size:11px;font-weight:700;padding:1px 5px;border-radius:3px;background:rgba(179,35,24,0.25);color:var(--red2);">CONTRACT</span>
          <span style="background:${roleBg[ev.role]};color:${roleColors[ev.role]};font-size:11px;font-weight:700;padding:1px 5px;border-radius:3px;">${ev.role}</span>
          ${ev.shift?`<span>${ev.shift}</span>`:''}
          <span style="font-weight:600;font-size:11px;">${ev.name}</span>
          <span style="color:var(--text3);font-size:11px;">${ev.type} · ${ev.date}</span>
        </div>`;
      });
      wk.certs.forEach(ev => {
        const urgency = ev.daysAway <= 7 ? 'rgba(179,35,24,0.25);color:var(--red2)' : 'rgba(180,83,9,0.25);color:var(--amber2)';
        eventHtml += `<div style="display:flex;align-items:center;gap:5px;padding:2px 0;">
          <span style="font-size:11px;font-weight:700;padding:1px 5px;border-radius:3px;background:${urgency};">${ev.cert}</span>
          <span style="background:${roleBg[ev.role]};color:${roleColors[ev.role]};font-size:11px;font-weight:700;padding:1px 5px;border-radius:3px;">${ev.role}</span>
          ${ev.shift?`<span>${ev.shift}</span>`:''}
          <span style="font-weight:600;font-size:11px;">${ev.name}</span>
          <span style="color:var(--text3);font-size:11px;">Exp: ${ev.date} · ${ev.daysAway}d</span>
        </div>`;
      });
    }

    // Projected vacancy per role
    let projHtml = roleKeys.map(role => {
      const budget = budgets[`${role.toLowerCase()}-total`] || null;
      if (!budget) return '';
      const dep      = departing[role]?.[wi] || 0;
      const filled   = Math.round(Math.max(0, baselineFilled[role] - dep) * 10) / 10;
      const vacant   = Math.round((budget - filled) * 10) / 10;
      const isOver   = vacant < 0;
      const color    = isOver ? 'var(--red2)' : vacant === 0 ? 'var(--amber2)' : 'var(--green2)';
      const label    = isOver ? `+${Math.abs(vacant)} over` : `${vacant} open`;
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;padding:2px 0;">
        <span style="background:${roleBg[role]};color:${roleColors[role]};font-weight:700;padding:1px 5px;border-radius:3px;font-size:11px;">${role}</span>
        <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:${color};">${filled}/${budget} · ${label}</span>
      </div>`;
    }).filter(Boolean).join('') || '<span style="color:var(--text3);font-size:11px;">Enter budgets above</span>';

    html += `<tr style="background:${rowBg}">
      <td>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:${isNow?'700':'400'};color:${isNow?'var(--accent2)':'var(--text2)'};">${isNow?'THIS WEEK':`Week ${wi+1}`}</div>
      </td>
      <td><div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text2);">${dateRange}</div></td>
      <td>${eventHtml}</td>
      <td>${projHtml}</td>
    </tr>`;
  });

  html += '</tbody></table>';

  // Cert summary section — all expirations in next 6 weeks sorted by date
  const allCerts = weeks.flatMap(w => w.certs).sort((a,b) => parseDate(a.date) - parseDate(b.date));
  if (allCerts.length > 0) {
    html += `<details class="vacancy-extra" id="vacancy-cert-details">
      <summary>Certification expirations <span>${allCerts.length} due in the next six weeks · also listed in the forecast</span></summary>
      <div class="vacancy-extra-content">
      <table class="forecast-table">
        <thead><tr>
          <th>Staff Member</th><th>Role</th><th>Shift</th><th>Certification</th><th>Expiration</th><th style="text-align:center;">Days Away</th>
        </tr></thead>
        <tbody>
        ${allCerts.map(ev => {
          const urgColor = ev.daysAway <= 7 ? 'var(--red2)' : ev.daysAway <= 14 ? 'var(--amber2)' : 'var(--text2)';
          return `<tr>
            <td style="font-weight:600;">${ev.name}</td>
            <td><span style="background:${roleBg[ev.role]};color:${roleColors[ev.role]};font-size:11px;font-weight:700;padding:1px 5px;border-radius:3px;">${ev.role}</span></td>
            <td>${ev.shift || '—'}</td>
            <td>${ev.cert}</td>
            <td style="font-family:'IBM Plex Mono',monospace;">${ev.date}</td>
            <td style="text-align:center;font-family:'IBM Plex Mono',monospace;font-weight:700;color:${urgColor};">${ev.daysAway}d</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
      </div>
    </details>`;
  }


  // CA Scheduling Requirements section
  const _caStaff = MASTER_STAFF.filter(s=>s.job==='CA');
  let _caSect = '<details class="vacancy-extra" id="vacancy-ca-details"><summary>CA scheduling reference <span>View individual scheduling requirements</span></summary><div class="vacancy-extra-content" style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:rgba(255,255,255,0.06);"><th style="padding:8px 10px;text-align:left;color:var(--teal2);">CA Staff</th><th style="padding:8px 6px;text-align:center;color:var(--text3);">FTE</th><th style="padding:8px 6px;text-align:center;color:var(--text3);">Shifts/4wk</th><th style="padding:8px 6px;text-align:center;color:var(--text3);">Hrs Target</th><th style="padding:8px 6px;text-align:center;color:var(--text3);">Shift Mix</th><th style="padding:8px 6px;text-align:center;color:var(--text3);">Weekend</th></tr></thead><tbody>';
  _caStaff.forEach((s,i) => {
    const _fte=parseFloat(state.empFTE[s.name])||0.9, _shifts=fteShiftsPerCycle(_fte,'CA')*2, _hrs=Math.round(_shifts*8);
    const _mix=_fte>=0.9?'2×12h + 2×8h/wk':_fte>=0.5?'2×8h/wk avg':'1×8h/wk avg';
    const _wknd=(_fte>=0.9||(_fte>=0.5&&_fte<0.6))?'⟳ Every Other':'1×/month';
    const _rb=i%2?'':'rgba(255,255,255,0.02)', _wc=(_fte>=0.9||(_fte>=0.5&&_fte<0.6))?'var(--green2)':'var(--amber2)';
    _caSect+='<tr style="background:'+_rb+';border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:6px 10px;font-weight:600;">'+s.name.split(',')[0]+'</td><td style="padding:4px 6px;text-align:center;color:var(--text3);">'+_fte+'</td><td style="padding:4px 6px;text-align:center;font-weight:700;color:var(--teal2);">'+_shifts+'</td><td style="padding:4px 6px;text-align:center;font-weight:700;color:var(--accent2);">'+_hrs+'h</td><td style="padding:4px 6px;text-align:center;font-size:11px;">'+_mix+'</td><td style="padding:4px 6px;text-align:center;color:'+_wc+';">'+_wknd+'</td></tr>';
  });
  _caSect += '</tbody></table></div></details>';
  html += _caSect;
  const openDetails = [...el.querySelectorAll('details[open]')].map(detail => detail.id);
  el.innerHTML = html;
  openDetails.forEach(id => { const detail = document.getElementById(id); if (detail) detail.open = true; });
}

function loadVacancyBudgets() {
  const budgets = state.vacancyBudgets || {};
  Object.entries(budgets).forEach(([key, val]) => {
    const el = document.getElementById(`vac-${key}-budget`);
    if (el) el.value = val;
  });
  renderVacancy();
}

function saveCAHours(name, hours) {
  // Toggle off if already selected
  if (state.empCAHours[name] === hours) {
    delete state.empCAHours[name];
  } else {
    state.empCAHours[name] = hours;
  }
  persistSave();
  showSaveBanner(`💾 CA hours preference saved for ${name.split(',')[0]}`);
  renderDirectory();
}

function saveEmpShift(name, shift) {
  if (state.empShifts[name] === shift) {
    delete state.empShifts[name];
  } else {
    state.empShifts[name] = shift;
  }
  persistSave();
  showSaveBanner(`💾 Shift preference saved for ${name.split(',')[0]}`);
  renderDirectory();
  renderVacancy();
}

function getWorkingOnShift(shift) {
  const dateKey = state.activeBoardDate || state.dates[0];
  if (!dateKey) return new Set();
  const shifts = state.placements[dateKey] || {};
  return new Set((shifts[shift]||[]).map(p=>p.name));
}

const DIR_COLS_KEY = '_dirColsCollapsed';
function getDirColsCollapsed() {
  const v = localStorage.getItem(DIR_COLS_KEY);
  return v === null ? true : v === '1'; // collapsed by default
}
function applyDirColsState() {
  const table = document.getElementById('dir-table');
  const btn = document.getElementById('dir-col-toggle-btn');
  const collapsed = getDirColsCollapsed();
  if (table) table.classList.toggle('cols-collapsed', collapsed);
  if (btn) btn.textContent = collapsed ? '▸ More Columns' : '▾ Fewer Columns';
}
function toggleDirColumns() {
  localStorage.setItem(DIR_COLS_KEY, getDirColsCollapsed() ? '0' : '1');
  applyDirColsState();
}

function renderDirectory() {
  applyDirColsState();
  const search    = (document.getElementById('dir-search')?.value || '').toLowerCase();
  const shiftTab  = state.dirShiftTab || 'ALL';
  const roleTab   = state.dirRoleTab  || 'ALL';
  const working   = getWorkingToday();
  const tbody     = document.getElementById('dir-tbody');
  if (!tbody) return;

  const dateKey = state.activeBoardDate || state.dates[0];
  const shifts  = dateKey ? (state.placements[dateKey] || {}) : {};

  // Day shift staff (0700-1500, 1500-1900, 0630-1430, 1430-1830)
  const dayWorking = new Set([
    ...(shifts['0700-1500']||[]).map(p=>p.name),
    ...(shifts['0630-1430']||[]).map(p=>p.name),
    ...(shifts['0630-1830']||[]).map(p=>p.name),
  ]);
  // Evening shift staff (1500-1900, 1430-1830, 1830-2230)
  const eveWorking = new Set([
    ...(shifts['1500-1900']||[]).map(p=>p.name),
    ...(shifts['1430-1830']||[]).map(p=>p.name),
    ...(shifts['1830-2230']||[]).map(p=>p.name),
    ...(shifts['1430-0300']||[]).map(p=>p.name),
  ]);
  // Night shift staff (1900-0700, 2230-0630, 1830-0630, 2300-0700)
  const ngtWorking = new Set([
    ...(shifts['1900-0700']||[]).map(p=>p.name),
    ...(shifts['2230-0630']||[]).map(p=>p.name),
    ...(shifts['1830-0630']||[]).map(p=>p.name),
    ...(shifts['2300-0700']||[]).map(p=>p.name),
  ]);

  let staff = [...MASTER_STAFF].filter(s => s.job !== 'NURSE MGR');

  // Apply shift/status filter
  switch(shiftTab) {
    case 'OFF_ALL':   staff = staff.filter(s => !working.has(s.name)); break;
    case 'WORKING':   staff = staff.filter(s =>  working.has(s.name)); break;
    case 'DAY_SHIFT':
      staff = staff.filter(s => {
        const sh = state.empShifts[s.name];
        return sh === 'DAY' || sh === 'BOTH' || dayWorking.has(s.name);
      }); break;
    case 'EVE_SHIFT':
      staff = staff.filter(s => {
        const sh = state.empShifts[s.name];
        return sh === 'EVE' || sh === 'BOTH' || eveWorking.has(s.name);
      }); break;
    case 'NGT_SHIFT':
      staff = staff.filter(s => {
        const sh = state.empShifts[s.name];
        return sh === 'NIGHT' || sh === 'BOTH' || ngtWorking.has(s.name);
      }); break;
  }

  // Apply role filter
  if (roleTab === 'RN' || roleTab === 'LPN' || roleTab === 'CA') {
    staff = staff.filter(s => s.job === roleTab);
  }

  if (search) staff = staff.filter(s => s.name.toLowerCase().includes(search));

  // Show/hide SMS panel — only when the Off Duty shift/status filter is active
  const smsPanel = document.getElementById('sms-broadcast-panel');
  if (smsPanel) smsPanel.style.display = (shiftTab === 'OFF_ALL') ? 'block' : 'none';

  tbody.innerHTML = staff.length === 0
    ? `<tr><td colspan="15" style="text-align:center;color:var(--text3);padding:20px;font-style:italic;">No staff match this filter.</td></tr>`
    : staff.map(s => {
        const isWorking = working.has(s.name);
        const cls       = isWorking ? 'working-today' : 'off-today';
        const dot       = isWorking
          ? '<span class="status-dot dot-working"></span>Working'
          : '<span class="status-dot dot-off"></span>Off Today';
        const phone     = state.phones[s.name]  || '';
        const email     = state.emails[s.name]  || '';
        const birthday  = state.birthdays[s.name]  || '';
        const hireDate  = (state.hireDates && state.hireDates[s.name]) || '';
        const empShift  = state.empShifts[s.name]    || '';
        const empFTE    = state.empFTE[s.name]        || '';
        const emp48     = state.emp48hr[s.name]       || false;
        const empWknd   = state.empWeekend[s.name]    || '';
        const empOrient = state.empOrientation[s.name]|| false;
        const empAgency = state.agencyDates[s.name]   || {};
        const isAgency  = !!empAgency.isAgency;
        const safe      = s.name.replace(/'/g, "\\'");
        const noteCount = (state.empNotes[s.name] || []).length;
        const fte025    = parseFloat(empFTE) === 0.25;

        // FTE selector
        const fteOptions = ['1','0.9','0.8','0.6','0.5','0.25'];
        const fteSelect = `<select style="background:var(--slate);border:1px solid var(--border);color:var(--white);font-family:'IBM Plex Mono',monospace;font-size:11px;padding:3px 5px;border-radius:4px;outline:none;cursor:pointer;" onchange="saveEmpFTE('${safe}',this.value)">
          <option value="">—</option>
          ${fteOptions.map(o=>`<option value="${o}" ${empFTE===o?'selected':''}>${o}</option>`).join('')}
        </select>`;

        // Weekend preference toggle
        // .25 FTE = 1x/month (W1 or W2 or W3 or W4), others = every other (W1=odd weekends, W2=even weekends)
        const wkndToggle = fte025
          ? `<div class="shift-toggle" title="Which weekend of the month">
              <button class="${empWknd==='W1'?'active-day':''}" onclick="saveEmpWeekend('${safe}','W1')">Wk1</button>
              <button class="${empWknd==='W2'?'active-day':''}" onclick="saveEmpWeekend('${safe}','W2')">Wk2</button>
              <button class="${empWknd==='W3'?'active-day':''}" onclick="saveEmpWeekend('${safe}','W3')">Wk3</button>
              <button class="${empWknd==='W4'?'active-day':''}" onclick="saveEmpWeekend('${safe}','W4')">Wk4</button>
            </div>`
          : `<div class="shift-toggle" title="Preferred weekend rotation">
              <button class="${empWknd==='W1'?'active-day':''}" onclick="saveEmpWeekend('${safe}','W1')" title="Odd weekends (1st, 3rd…)">Odd</button>
              <button class="${empWknd==='W2'?'active-night':''}" onclick="saveEmpWeekend('${safe}','W2')" title="Even weekends (2nd, 4th…)">Even</button>
            </div>`;

        // 48hr button — RNs only
        const btn48 = s.job === 'RN'
          ? `<button onclick="toggle48hr('${safe}')" style="padding:3px 8px;border-radius:4px;border:1px solid ${emp48?'var(--amber2)':'var(--border)'};background:${emp48?'rgba(180,83,9,0.25)':'transparent'};color:${emp48?'var(--amber2)':'var(--text3)'};font-size:11px;font-weight:700;cursor:pointer;">${emp48?'✓ 48hr':'48hr'}</button>`
          : `<span style="color:var(--text3);font-size:11px;">—</span>`;

        // Shift toggle — CAs get Eve option + hours selector
        const isCA = s.job === 'CA';
        const caHours = state.empCAHours[s.name] || '';
        const shiftToggle = `<div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;">
          <div class="shift-toggle">
            <button class="${empShift==='DAY'?'active-day':''}" onclick="saveEmpShift('${safe}','DAY')" title="Day">☀️</button>
            ${isCA ? `<button class="${empShift==='EVE'?'active-eve':''}" onclick="saveEmpShift('${safe}','EVE')" title="Eve">🌆</button>` : ''}
            <button class="${empShift==='NIGHT'?'active-night':''}" onclick="saveEmpShift('${safe}','NIGHT')" title="Night">🌙</button>
            <button class="${empShift==='BOTH'?'active-both':''}" onclick="saveEmpShift('${safe}','BOTH')" title="All">↔</button>
          </div>
          ${isCA ? `<div class="shift-toggle" style="margin-top:1px;">
            <button class="${caHours==='8'?'active-eve':''}" onclick="saveCAHours('${safe}','8')" title="8-hour shifts" style="font-size:11px;padding:2px 6px;">8hr</button>
            <button class="${caHours==='12'?'active-night':''}" onclick="saveCAHours('${safe}','12')" title="12-hour shifts" style="font-size:11px;padding:2px 6px;">12hr</button>
          </div>` : ''}
        </div>`;

        // Float/sitter from summary
        let floatCell = '<span style="color:var(--text3);font-size:11px;">—</span>';
        if (window._floatSummary) {
          const key = Object.keys(window._floatSummary).find(k => {
            const kl=k.toLowerCase(); const nl=s.name.toLowerCase();
            const kp=kl.split(','); const np=nl.split(',');
            return kp[0].trim().substring(0,6)===np[0].trim().substring(0,6) &&
                   (kp[1]||'').trim().substring(0,3)===(np[1]||'').trim().substring(0,3);
          });
          const sum = key ? window._floatSummary[key] : null;
          if (sum) {
            const rows = [];
            if (sum.lastFloat  && sum.lastFloat  !=='-') rows.push(`<span style="color:var(--accent2);">Float</span> ${sum.lastFloat}`);
            if (sum.lastSitter && sum.lastSitter !=='-') rows.push(`<span style="color:var(--purple2);">Sitter</span> ${sum.lastSitter}`);
            if (sum.lastCallOff&& sum.lastCallOff!=='-') rows.push(`<span style="color:var(--red2);">Call Off</span> ${sum.lastCallOff}`);
            floatCell = rows.length
              ? `<div style="font-size:11px;font-family:'IBM Plex Mono',monospace;line-height:1.6;">${rows.map(r=>`<div>${r}</div>`).join('')}</div>`
              : '<span style="color:var(--text3);font-size:11px;">No activity</span>';
          }
        }

        const textBtn = isWorking
          ? `<span style="color:var(--text3);font-size:11px;">—</span>`
          : phone
            ? `<div style="display:flex;gap:4px;align-items:center;"><button class="sms-text-btn" onclick="sendSMSToOne('${safe}')">💬</button><button class="qr-btn" onclick="showQR('${safe}')" title="QR">📱</button></div>`
            : `<button class="sms-text-btn no-phone" disabled title="Add phone first">💬</button>`;

        const removeBtn = `<button class="move-btn remove-btn" onclick="removeEmployee('${safe}')" title="Remove">✕</button>`;
        const notesBtn  = `<button class="btn btn-ghost btn-sm" onclick="openEmpNotes('${safe}')" style="padding:3px 8px;font-size:11px;">📝${noteCount>0?` <span style="background:var(--accent);color:#fff;border-radius:8px;padding:0 4px;font-size:11px;">${noteCount}</span>`:''}</button>`;
        const empProf   = (state.empProfile || {})[s.name] || {};
        const profDone  = !!(empProf.food || empProf.movie || empProf.hobbies);
        const oriSigned = !!empProf.oriSheetSigned;
        const profileBtn = `<button class="btn btn-ghost btn-sm" onclick="openEmpProfile('${safe}')" style="padding:3px 8px;font-size:11px;${oriSigned?'color:var(--green2);':profDone?'color:var(--teal2);':''}" title="${oriSigned?'Ori Sheet signed ✓':'Profile — click to view/edit'}">👤${oriSigned?' 📋':profDone?' ✓':''}</button>`;
        const empDocsRec = (state.empDocs || {})[s.name] || {};
        const docsCount  = ['contract','orientation','xensys','offboard'].filter(k => empDocsRec[k] && empDocsRec[k].url).length;
        const docsBtn    = `<button class="btn btn-ghost btn-sm" onclick="openEmpDocs('${safe}')" style="padding:3px 8px;font-size:11px;${docsCount>0?'color:var(--teal2);':''}" title="Orientation / Xensys Onboarding / Offboarding documents">📎${docsCount>0?` <span style="background:var(--accent);color:#fff;border-radius:8px;padding:0 4px;font-size:11px;">${docsCount}</span>`:''}</button>`;
        const isCustom  = state.customStaff.some(c=>c.name===s.name);

        return `<tr class="${cls}">
          <td style="font-weight:600;"><span onclick="openEmployeeHub('${safe}')" style="cursor:pointer;color:var(--accent2);text-decoration:underline dotted;text-underline-offset:2px;" title="View full employee profile">${s.name}</span>${isCustom?' <span style="font-size:11px;color:var(--accent2);background:rgba(46,125,209,0.15);border-radius:3px;padding:1px 5px;">Custom</span>':''}${isAgency?`<div style="font-size:11px;color:var(--purple2);margin-top:2px;">🏥 Agency${empAgency.contractNum?' <span style="font-family:IBM Plex Mono,monospace;background:rgba(139,92,246,0.12);color:var(--accent2);padding:1px 5px;border-radius:3px;">#'+empAgency.contractNum+'</span>':''}</div>`:''}</td>
          <td><span class="tag tag-${s.job.toLowerCase()}">${s.job}</span></td>
          <td>${shiftToggle}</td>
          <td>${fteSelect}</td>
          <td class="dir-col-collapsible">${wkndToggle}</td>
          <td>${btn48}</td>
          <td><label style="display:flex;align-items:center;justify-content:center;gap:4px;cursor:pointer;font-size:11px;color:${empOrient?'var(--amber2)':'var(--text3)'};">
            <input type="checkbox" ${empOrient?'checked':''} onchange="toggleOrientation('${safe}',this.checked)" style="accent-color:var(--amber2);cursor:pointer;">
            ${empOrient?'On':'—'}
          </label></td>
          <td class="dir-col-collapsible"><label style="display:flex;align-items:center;justify-content:center;gap:4px;cursor:pointer;font-size:11px;color:${state.empPreceptor[s.name]?'var(--green2)':'var(--text3)'};" title="Certified preceptor">
            <input type="checkbox" ${state.empPreceptor[s.name]?'checked':''} onchange="togglePreceptor('${safe}',this.checked)" style="accent-color:var(--green2);cursor:pointer;">
            ${state.empPreceptor[s.name]?'🎓':'—'}
          </label></td>
          <td><label style="display:flex;align-items:center;justify-content:center;gap:4px;cursor:pointer;font-size:11px;${state.empAlwaysCharge[s.name]?'color:gold;font-weight:700;':'color:var(--text3);'}" title="When checked, this person is automatically assigned as 3B charge when on the board">
            <input type="checkbox" ${state.empAlwaysCharge[s.name]?'checked':''} onchange="toggleAlwaysCharge('${safe}',this.checked)" style="accent-color:gold;cursor:pointer;width:14px;height:14px;" ${s.job!=='RN'?'disabled title="Only RNs can be charge nurses"':''}>
            ${state.empAlwaysCharge[s.name]?'⭐':'—'}
          </label></td>
          <td>
            ${(()=>{
              const dbl = (state.empDbl || {})[s.name] || {};
              const onDbl = !!dbl.onLeave;
              const inputStyle = "background:var(--slate);border:1px solid var(--border);color:var(--white);padding:1px 4px;border-radius:3px;font-size:11px;width:76px;outline:none;margin-top:1px;";
              return `<div style="display:flex;flex-direction:column;gap:2px;min-width:100px;">
                <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:${onDbl?'var(--purple2)':'var(--text3)'};">
                  <input type="checkbox" ${onDbl?'checked':''} onchange="toggleDbl('${safe}',this.checked)" style="accent-color:var(--purple2);cursor:pointer;width:13px;height:13px;">
                  ${onDbl?'🤱 On Leave':'—'}
                </label>
                ${onDbl?`<input type="text" value="${dbl.startDate||''}" placeholder="Start MM/DD/YY"
                  style="${inputStyle}" title="Leave start date"
                  oninput="saveDbl('${safe}','startDate',this.value)"
                  onblur="saveDbl('${safe}','startDate',this.value)">
                <input type="text" value="${dbl.returnDate||''}" placeholder="Return MM/DD/YY"
                  style="${inputStyle}color:var(--green2);" title="Expected return date"
                  oninput="saveDbl('${safe}','returnDate',this.value)"
                  onblur="saveDbl('${safe}','returnDate',this.value)">`:''}</div>`;
            })()}
          </td>
          <td class="dir-col-collapsible"><label style="display:flex;align-items:center;justify-content:center;gap:4px;${s.job==='CA'?'cursor:not-allowed;opacity:0.35;':'cursor:pointer;'}font-size:11px;color:${state.empPayEligible[s.name]?'var(--green2)':'var(--text3)'};" title="RN/LPN: Eligible Pay">
            <input type="checkbox" ${state.empPayEligible[s.name]?'checked':''} ${s.job==='CA'?'disabled':''} onchange="togglePayFlag('${safe}','empPayEligible',this.checked)" style="accent-color:var(--green2);cursor:pointer;width:13px;height:13px;">
            ${state.empPayEligible[s.name]?'✓':'—'}
          </label></td>
          <td>
            <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;min-width:130px;">
              <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;${isAgency?'color:var(--purple2);font-weight:700;':'color:var(--text3);'}">
                <input type="checkbox" ${isAgency?'checked':''} onchange="toggleAgency('${safe}',this.checked)" style="accent-color:var(--purple2);cursor:pointer;width:13px;height:13px;">
                ${isAgency?'Agency':'Staff'}
              </label>
              ${isAgency ? `<div style="font-size:11px;font-family:'IBM Plex Mono',monospace;line-height:1.6;">
                <div style="display:flex;align-items:center;gap:3px;">
                  <span style="color:var(--text3);width:22px;">Strt</span>
                  <input type="text" value="${empAgency.contractStart||''}" placeholder="MM/DD/YY"
                    style="background:var(--slate);border:1px solid var(--border);color:var(--white);padding:1px 4px;border-radius:3px;font-size:11px;width:72px;font-family:'IBM Plex Mono',monospace;"
                    oninput="saveAgency('${safe}','contractStart',this.value)"
                    onblur="saveAgency('${safe}','contractStart',this.value)">
                </div>
                <div style="display:flex;align-items:center;gap:3px;">
                  <span style="color:var(--text3);width:22px;">End</span>
                  <input type="text" value="${empAgency.contractEnd||''}" placeholder="MM/DD/YY"
                    style="background:var(--slate);border:1px solid var(--border);color:${empAgency.contractEnd?('exp-'+certClass(empAgency.contractEnd)==='exp-critical'?'var(--red2)':'exp-'+certClass(empAgency.contractEnd)==='exp-soon'?'var(--amber2)':'var(--green2)'):'var(--white)'};padding:1px 4px;border-radius:3px;font-size:11px;width:72px;font-family:'IBM Plex Mono',monospace;"
                    oninput="saveAgency('${safe}','contractEnd',this.value)"
                    onblur="saveAgency('${safe}','contractEnd',this.value)">
                </div>
                ${empAgency.extensionEnd ? `<div style="display:flex;align-items:center;gap:3px;">
                  <span style="color:var(--text3);width:22px;">Ext</span>
                  <input type="text" value="${empAgency.extensionEnd||''}" placeholder="MM/DD/YY"
                    style="background:var(--slate);border:1px solid var(--border);color:var(--green2);padding:1px 4px;border-radius:3px;font-size:11px;width:72px;font-family:'IBM Plex Mono',monospace;"
                    oninput="saveAgency('${safe}','extensionEnd',this.value)"
                    onblur="saveAgency('${safe}','extensionEnd',this.value)">
                </div>` : `<div style="display:flex;align-items:center;gap:3px;margin-top:1px;">
                  <span style="color:var(--text3);width:22px;font-size:11px;">Ext</span>
                  <input type="text" value="" placeholder="+Ext date"
                    style="background:transparent;border:1px dashed rgba(255,255,255,0.15);color:var(--text3);padding:1px 4px;border-radius:3px;font-size:11px;width:72px;font-family:'IBM Plex Mono',monospace;"
                    oninput="saveAgency('${safe}','extensionEnd',this.value)"
                    onblur="saveAgency('${safe}','extensionEnd',this.value)">
                </div>`}
                 <div style="display:flex;align-items:center;gap:3px;margin-top:2px;padding-top:2px;border-top:1px solid rgba(255,255,255,0.08);">
                   <span style="color:var(--accent2);width:22px;font-size:11px;">ID#</span>
                   <input type="text" value="${empAgency.contractNum||''}" placeholder="Contract #"
                     style="background:var(--slate);border:1px solid rgba(46,125,209,0.35);color:var(--accent2);padding:1px 4px;border-radius:3px;font-size:11px;width:88px;outline:none;font-family:'IBM Plex Mono',monospace;"
                     oninput="saveAgency('${safe}','contractNum',this.value)"
                     onblur="saveAgency('${safe}','contractNum',this.value)"
                     title="Agency contract number">
                 </div>
                 ${(()=>{
                   const bs = empAgency.blockSchedule || {};
                   return `<div style="margin-top:3px;padding-top:3px;border-top:1px solid rgba(255,255,255,0.08);">
                     <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:${bs.enabled?'var(--purple2)':'var(--text3)'};">
                       <input type="checkbox" ${bs.enabled?'checked':''} onchange="saveAgencyBlock('${safe}','enabled',this.checked)" style="accent-color:var(--purple2);cursor:pointer;width:12px;height:12px;">
                       📦 Block Sched
                     </label>
                     ${bs.enabled ? `<div style="display:flex;align-items:center;gap:3px;margin-top:2px;">
                       <input type="number" min="1" max="28" value="${bs.on ?? 7}" title="Days On"
                         style="background:var(--slate);border:1px solid var(--border);color:var(--white);padding:1px 3px;border-radius:3px;font-size:11px;width:30px;font-family:'IBM Plex Mono',monospace;"
                         onchange="saveAgencyBlock('${safe}','on',parseInt(this.value)||7)">
                       <span style="color:var(--text3);font-size:11px;">on</span>
                       <input type="number" min="1" max="28" value="${bs.off ?? 7}" title="Days Off"
                         style="background:var(--slate);border:1px solid var(--border);color:var(--white);padding:1px 3px;border-radius:3px;font-size:11px;width:30px;font-family:'IBM Plex Mono',monospace;"
                         onchange="saveAgencyBlock('${safe}','off',parseInt(this.value)||7)">
                       <span style="color:var(--text3);font-size:11px;">off</span>
                     </div>
                     <input type="text" value="${bs.startDate||empAgency.contractStart||''}" placeholder="Block start MM/DD/YY"
                       style="background:var(--slate);border:1px solid var(--border);color:var(--white);padding:1px 4px;border-radius:3px;font-size:11px;width:110px;font-family:'IBM Plex Mono',monospace;margin-top:2px;"
                       onblur="saveAgencyBlock('${safe}','startDate',this.value)"
                       onkeydown="if(event.key==='Enter')saveAgencyBlock('${safe}','startDate',this.value)">` : ''}
                   </div>`;
                 })()}
              </div>` : ''}
            </div>
          </td>
          <td class="dir-col-collapsible" style="font-size:11px;">${dot}</td>
          <td class="dir-col-collapsible">${floatCell}</td>
          <td><input type="text" class="phone-input" style="width:80px;" value="${birthday}" placeholder="MM/DD" onblur="saveBday('${safe}',this.value)" title="Birthday (MM/DD)"></td>
          <td><input type="date" class="phone-input" style="width:120px;" value="${hireDate}" onblur="saveHireDate('${safe}',this.value)" title="Date of Hire"></td>
          <td><input type="tel" class="phone-input" value="${phone}" placeholder="(607) 555-0000" onblur="savePhone('${safe}',this.value)"></td>
          <td><input type="email" class="phone-input" style="width:150px;" value="${email}" placeholder="email@arnot.org" onblur="saveEmail('${safe}',this.value)"></td>
          <td>${textBtn}</td>
          <td>${profileBtn}</td>
          <td>${notesBtn}</td>
          <td>${docsBtn}</td>
          <td>${removeBtn}</td>
        </tr>`;
      }).join('');

  renderSMSPanel();
}

function renderSMSPanel() {
  const working = getWorkingToday();
  const roleFilter = ['RN','LPN','CA'].includes(state.dirRoleTab) ? state.dirRoleTab : null;
  const allOff = MASTER_STAFF.filter(s => {
    if (s.job === 'NURSE MGR') return false;
    if (working.has(s.name)) return false;
    if (roleFilter && s.job !== roleFilter) return false;
    return true;
  });
  const withPhone = allOff.filter(s => !!(state.phones?.[s.name]));

  // Labels
  const roleLabel = roleFilter ? roleFilter + ' ' : '';
  const countEl   = document.getElementById('sms-off-count');
  const subTitle  = document.getElementById('sms-panel-subtitle');
  const chipLabel = document.getElementById('sms-chip-label');
  const broadBtn  = document.getElementById('sms-broadcast-btn');

  if (countEl)  countEl.textContent  = `${allOff.length} ${roleLabel}off duty · ${withPhone.length} have phone`;
  if (subTitle) subTitle.textContent = `Send a message to ${roleLabel}off-duty staff — individually or broadcast to all`;
  if (chipLabel) chipLabel.textContent = `${roleLabel}Off-Duty Staff — Text Individually`;
  if (broadBtn) broadBtn.textContent = `💬 Text All ${roleLabel}Off-Duty`;

  // Chips
  const listEl = document.getElementById('sms-off-list');
  if (!listEl) return;

  if (allOff.length === 0) {
    listEl.innerHTML = `<span style="color:var(--text3);font-size:12px;font-style:italic;">All ${roleLabel}staff are working today.</span>`;
    return;
  }

  const roleColors = { RN:'var(--accent2)', LPN:'var(--purple2)', CA:'var(--teal2)', UC:'var(--green2)' };
  const roleBg     = { RN:'rgba(46,125,209,0.2)', LPN:'rgba(91,33,182,0.2)', CA:'rgba(14,116,144,0.2)', UC:'rgba(26,122,74,0.2)' };

  listEl.innerHTML = allOff.map(s => {
    const hasPhone  = !!(state.phones?.[s.name]);
    const btnCls    = hasPhone ? 'chip-btn' : 'chip-btn no-phone';
    const btnTitle  = hasPhone ? '' : 'title="No phone number on file"';
    const btnOnclick = hasPhone ? `onclick="sendSMSToOne('${s.name}')"` : '';
    return `<div class="sms-off-chip">
      <span class="chip-role" style="background:${roleBg[s.job]||'rgba(100,116,139,0.2)'};color:${roleColors[s.job]||'var(--text2)'};">${s.job}</span>
      <span class="chip-name">${s.name}</span>
      <button class="${btnCls}" ${btnOnclick} ${btnTitle}>${hasPhone ? '💬' : '📵'}</button>
      ${hasPhone ? `<button class="chip-btn" onclick="showQR('${s.name}')" title="QR code for phone" style="background:rgba(46,125,209,0.2);color:var(--accent2);">📱</button>` : ''}
    </div>`;
  }).join('');
}

function toggleSmsPanel() {
  const body = document.getElementById('sms-panel-body');
  const btn  = document.querySelector('#sms-broadcast-panel .sms-broadcast-header .btn-ghost');
  if (!body) return;
  const collapsed = body.style.display === 'none';
  body.style.display = collapsed ? 'block' : 'none';
  if (btn) btn.textContent = collapsed ? '▾ Collapse' : '▸ Expand';
}

function getSMSMessage() {
  const msg = (document.getElementById('sms-broadcast-msg')?.value || '').trim();
  if (!msg) { alert('Please enter a message before sending.'); return null; }
  return msg;
}

function openSMSOrCopy(phone, msg) {
  const clean = phone.replace(/\D/g,'');
  if (!clean || clean.length < 10) return;
  const isFile   = window.location.protocol === 'file:';
  const isApple  = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!isFile && isMobile) {
    // On mobile browser — open SMS app directly
    const sep = isApple ? '&' : '?';
    window.open(`sms:+1${clean}${sep}body=${encodeURIComponent(msg)}`, '_self');
  } else {
    // Desktop or file:// — copy number + message
    const full = `To: +1${clean.replace(/(\d{3})(\d{3})(\d{4})/,'($1) $2-$3')}\n\n${msg}`;
    navigator.clipboard.writeText(full).then(() => {
      showSaveBanner('📋 Phone number + message copied — paste into your SMS app');
    }).catch(() => {
      prompt(`Copy this message to send via SMS to +1${clean}:`, msg);
    });
  }
}

function sendSMSToOne(name) {
  const msg = getSMSMessage();
  if (!msg) return;
  const phone = state.phones[name] || '';
  if (!phone) { alert(`No phone number on file for ${name}. Add it in the Phone column first.`); return; }
  const clean  = phone.replace(/\D/g, '');
  openSMSOrCopy(clean, msg);
}

function broadcastSMS() {
  const msg = getSMSMessage();
  if (!msg) return;
  const working = getWorkingToday();
  const roleFilter = ['RN','LPN','CA'].includes(state.dirRoleTab) ? state.dirRoleTab : null;

  const targets = MASTER_STAFF.filter(s => {
    if (s.job === 'NURSE MGR') return false;
    if (working.has(s.name)) return false;
    if (roleFilter && s.job !== roleFilter) return false;
    return !!(state.phones?.[s.name]);
  });

  if (targets.length === 0) {
    alert('No off-duty staff with phone numbers found for this filter. Add phone numbers in the Phone column first.');
    return;
  }

  const roleLabel = roleFilter ? roleFilter + ' ' : '';
  const names = targets.map(s => `• ${s.name} (${state.phones?.[s.name]||''})`).join('\n');
  if (!confirm(`Send to ${targets.length} ${roleLabel}off-duty staff?\n\n${names}\n\nNote: Some devices only support one recipient at a time via SMS link. Use individual 💬 buttons if needed.`)) return;

  const allNumbers = targets.map(s => (state.phones?.[s.name]||'').replace(/\D/g, '')).join(',');
  const isApple    = /iPhone|iPad|iPod|Mac/i.test(navigator.userAgent);
  window.open(`sms:${allNumbers}${isApple ? '&' : '?'}body=${encodeURIComponent(msg)}`, '_self');
}