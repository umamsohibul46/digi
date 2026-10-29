import { AppData, OngoingExamSession, Question, Submission, TeacherAccount } from '../types';
import { initialDefaultData } from '../data/initialData';

export const STORAGE_KEY = 'cbt_sohibul_umam_db_v7';
export const SESSION_PREFIX = 'cbt_session_';

// ==========================================
// ONGOING EXAM SESSIONS (DISCONNECT PROTECTION)
// ==========================================
export function saveStudentExamSession(session: OngoingExamSession): void {
  try {
    const key = `${SESSION_PREFIX}${session.studentUsername}_${session.examId}`;
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem(`cbt_last_active_exam_${session.studentUsername}`, session.examId);
    // Also backup draft answers
    localStorage.setItem(`cbt_draft_${session.studentUsername}_${session.examId}`, JSON.stringify(session.answers));
  } catch (e) {
    console.error('Failed to save student exam session to localStorage', e);
  }
}

export function getStudentExamSession(studentUsername: string, examId?: string, appData?: AppData): OngoingExamSession | null {
  try {
    let targetExamId = examId;
    if (!targetExamId) {
      targetExamId = localStorage.getItem(`cbt_last_active_exam_${studentUsername}`) || undefined;
    }

    if (targetExamId) {
      const localStr = localStorage.getItem(`${SESSION_PREFIX}${studentUsername}_${targetExamId}`);
      if (localStr) {
        const session: OngoingExamSession = JSON.parse(localStr);
        return session;
      }
    }

    // Scan all keys in localStorage for this student
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${SESSION_PREFIX}${studentUsername}_`)) {
        const val = localStorage.getItem(k);
        if (val) {
          try {
            const parsed: OngoingExamSession = JSON.parse(val);
            if (!targetExamId || parsed.examId === targetExamId) {
              return parsed;
            }
          } catch {}
        }
      }
    }

    // Check in appData ongoingSessions if provided
    if (appData?.ongoingSessions) {
      if (targetExamId && appData.ongoingSessions[`${studentUsername}_${targetExamId}`]) {
        return appData.ongoingSessions[`${studentUsername}_${targetExamId}`];
      }
      for (const [, s] of Object.entries(appData.ongoingSessions)) {
        if (s.studentUsername === studentUsername && (!targetExamId || s.examId === targetExamId)) {
          return s;
        }
      }
    }
  } catch (e) {
    console.error('Failed to get student exam session', e);
  }
  return null;
}

export function clearStudentExamSession(studentUsername: string, examId: string): void {
  try {
    localStorage.removeItem(`${SESSION_PREFIX}${studentUsername}_${examId}`);
    localStorage.removeItem(`cbt_draft_${studentUsername}_${examId}`);
    const lastActive = localStorage.getItem(`cbt_last_active_exam_${studentUsername}`);
    if (lastActive === examId) {
      localStorage.removeItem(`cbt_last_active_exam_${studentUsername}`);
    }
  } catch (e) {
    console.error('Failed to clear student exam session', e);
  }
}

export const DEMO_SAMPLE_USERNAMES = new Set([
  'guru_bahasa',
  'guru_ips',
  'guru_pai',
  'guru_pkn',
  'guru_akl',
  'guru_dkv',
  'guru1',
  'guru_indo',
  'guru_mtk',
  'guru_ipa',
  'guru_bing',
  'guru_bindo',
  'guru_rpl',
  'guru_tkj',
  'guru_tkr',
]);

export function isDemoTeacher(t: { username: string; name?: string }): boolean {
  const u = (t.username || '').toLowerCase().trim();
  const n = (t.name || '').toLowerCase().trim();
  if (u === 'sohibul') return false;
  if (DEMO_SAMPLE_USERNAMES.has(u)) return true;
  if (n.includes('rahman spd') && u.includes('guru_bahasa')) return true;
  return false;
}

// Persistent Teacher Password Storage (Protects against reverting to default password)
export const TEACHER_CREDENTIALS_KEY = 'cbt_teacher_credentials_v1';

export function savePersistentTeacherCredentials(creds: Record<string, string>): void {
  try {
    const cleanCreds = { ...creds };
    DEMO_SAMPLE_USERNAMES.forEach((uname) => {
      delete cleanCreds[uname];
      delete cleanCreds[uname.toLowerCase()];
    });
    localStorage.setItem(TEACHER_CREDENTIALS_KEY, JSON.stringify(cleanCreds));
  } catch (e) {
    console.error('Failed to save persistent teacher credentials', e);
  }
}

export function getPersistentTeacherCredentials(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TEACHER_CREDENTIALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      DEMO_SAMPLE_USERNAMES.forEach((uname) => {
        delete parsed[uname];
        delete parsed[uname.toLowerCase()];
      });
      return parsed;
    }
  } catch (e) {
    console.error('Failed to get persistent teacher credentials', e);
  }
  return {};
}

export function cleanDemoQuestions(data: AppData): AppData {
  const isDemoQuestionId = (id: string) => {
    return (
      id.startsWith('bq-sample-') ||
      id.startsWith('bq-bindo-') ||
      id.startsWith('bq-bing-') ||
      id.startsWith('bq-ipa-') ||
      id.startsWith('bq-mtk-') ||
      id.startsWith('bq-rpl-') ||
      id.startsWith('bq-tkj-') ||
      id.startsWith('bq-oto-') ||
      id.startsWith('bq-8-') ||
      id.startsWith('bq-9-') ||
      id.startsWith('bq-10-') ||
      id.startsWith('bq-11-') ||
      id.startsWith('bq-12-')
    );
  };

  const isDemoExamId = (id: string) => {
    return (
      id === 'EXAM-BINDO-7' ||
      id === 'EXAM-BING-7' ||
      id === 'EXAM-IPA-7' ||
      id === 'EXAM-MTK-7' ||
      id === 'EXAM-RPL-10' ||
      id === 'EXAM-TKJ-10' ||
      id === 'EXAM-OTO-10'
    );
  };

  // Keep bank questions clean of random demo subjects
  const cleanedBank = Array.isArray(data.bankQuestions)
    ? data.bankQuestions.filter((q) => !isDemoQuestionId(q.id))
    : initialDefaultData.bankQuestions || [];

  // Ensure clean exams: remove demo exams
  const cleanedExams = Array.isArray(data.exams)
    ? data.exams
        .filter((e) => !isDemoExamId(e.id))
        .map((e) => ({
          ...e,
          questions: Array.isArray(e.questions)
            ? e.questions.filter((q) => !isDemoQuestionId(q.id))
            : [],
        }))
    : initialDefaultData.exams || [];

  return {
    ...data,
    bankQuestions: cleanedBank,
    exams: cleanedExams,
  };
}

export function cleanDemoTeachers(data: AppData): AppData {
  const cleanedData = cleanDemoQuestions(data);
  const defaultTeachersMap = new Map((initialDefaultData.teachers || []).map((t) => [t.username, t]));
  const persistentCreds = getPersistentTeacherCredentials();

  // Combine credentials giving precedence to current data.teacherCredentials, then persistentCreds
  const cleanCreds: Record<string, string> = {
    ...persistentCreds,
    ...(cleanedData.teacherCredentials || {}),
  };
  Object.keys(cleanCreds).forEach((uname) => {
    if (DEMO_SAMPLE_USERNAMES.has(uname.toLowerCase())) {
      delete cleanCreds[uname];
    }
  });

  if (!cleanCreds.sohibul) {
    cleanCreds.sohibul = 'password123';
  }

  const filteredTeachers: TeacherAccount[] = (cleanedData.teachers || [])
    .filter((t) => !isDemoTeacher(t))
    .map((t) => {
      const defaultData = defaultTeachersMap.get(t.username);
      const customPass = cleanCreds[t.username] || t.password || defaultData?.password || 'password123';
      return {
        ...t,
        password: customPass,
        biodata: t.biodata || defaultData?.biodata,
        schedules: t.schedules && t.schedules.length > 0 ? t.schedules : defaultData?.schedules || [],
      };
    });

  // Ensure sohibul (super admin) always exists without re-adding deleted teachers
  if (!filteredTeachers.some((t) => t.username.toLowerCase() === 'sohibul')) {
    const defaultSohibul = defaultTeachersMap.get('sohibul') || (initialDefaultData.teachers || [])[0];
    if (defaultSohibul) {
      filteredTeachers.unshift({
        ...defaultSohibul,
        password: cleanCreds.sohibul || defaultSohibul.password,
      });
    }
  } else {
    // If sohibul is present, ensure role is admin and has biodata and updated password
    const sohibulIdx = filteredTeachers.findIndex((t) => t.username.toLowerCase() === 'sohibul');
    if (sohibulIdx !== -1) {
      filteredTeachers[sohibulIdx].role = 'admin';
      if (!filteredTeachers[sohibulIdx].biodata) {
        filteredTeachers[sohibulIdx].biodata = defaultTeachersMap.get('sohibul')?.biodata;
      }
      if (!filteredTeachers[sohibulIdx].schedules || filteredTeachers[sohibulIdx].schedules?.length === 0) {
        filteredTeachers[sohibulIdx].schedules = defaultTeachersMap.get('sohibul')?.schedules || [];
      }
      filteredTeachers[sohibulIdx].password = cleanCreds.sohibul || 'password123';
    }
  }

  return {
    ...cleanedData,
    teachers: filteredTeachers,
    teacherCredentials: cleanCreds,
  };
}

export function getStoredData(): AppData {
  const persistentCreds = getPersistentTeacherCredentials();
  let item = localStorage.getItem(STORAGE_KEY);
  if (!item) {
    // Check v6, v5, v4, v3, v2 or v1 for migration
    const oldItem =
      localStorage.getItem('cbt_sohibul_umam_db_v6') ||
      localStorage.getItem('cbt_sohibul_umam_db_v5') ||
      localStorage.getItem('cbt_sohibul_umam_db_v4') ||
      localStorage.getItem('cbt_sohibul_umam_db_v3') ||
      localStorage.getItem('cbt_sohibul_umam_db_v2') ||
      localStorage.getItem('cbt_sohibul_umam_db_v1');
    if (oldItem) {
      try {
        const oldParsed: AppData = JSON.parse(oldItem);
        if (oldParsed && oldParsed.bankQuestions) {
          const cleaned = cleanDemoTeachers(oldParsed);
          saveStoredData(cleaned);
          return cleaned;
        }
      } catch (e) {
        console.error('Migration error from previous version', e);
      }
    }
    const defaultDataWithPersistent = {
      ...initialDefaultData,
      teacherCredentials: {
        ...initialDefaultData.teacherCredentials,
        ...persistentCreds,
      },
    };
    saveStoredData(defaultDataWithPersistent);
    return defaultDataWithPersistent;
  }
  try {
    const parsed: AppData = JSON.parse(item);
    if (!parsed || !Array.isArray(parsed.exams)) {
      return initialDefaultData;
    }
    const cleaned = cleanDemoTeachers(parsed);
    return cleaned;
  } catch (e) {
    console.error('Failed to parse stored CBT data, using defaults', e);
    return initialDefaultData;
  }
}

export function saveStoredData(data: AppData): void {
  try {
    const cleaned = cleanDemoTeachers(data);
    if (cleaned.teacherCredentials && Object.keys(cleaned.teacherCredentials).length > 0) {
      savePersistentTeacherCredentials(cleaned.teacherCredentials);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch (e) {
    console.error('Failed to save CBT data to localStorage', e);
  }
}

export function resetToDefaultData(): AppData {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDefaultData));
  return initialDefaultData;
}

// Cloud / Server Sync APIs
export async function fetchServerData(): Promise<AppData | null> {
  try {
    const res = await fetch('/api/cbt-data', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.success && json.data) {
      return cleanDemoTeachers(json.data as AppData);
    }
  } catch {
    // Network or server error silently ignored (fallback to local)
  }
  return null;
}

export async function syncDataToServer(data: AppData): Promise<boolean> {
  try {
    const cleaned = cleanDemoTeachers(data);
    const res = await fetch('/api/cbt-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: cleaned }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json && json.success);
  } catch {
    return false;
  }
}

export async function syncSubmissionToServer(submission: Submission): Promise<boolean> {
  try {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json && json.success);
  } catch {
    return false;
  }
}

// Export / Import Sync Code (Offline Transfer between Computer and HP)
export function exportDataToSyncCode(data: AppData): string {
  try {
    const json = JSON.stringify(data);
    return btoa(encodeURIComponent(json));
  } catch {
    return JSON.stringify(data);
  }
}

export function importDataFromSyncCode(code: string): AppData | null {
  try {
    let json = code.trim();
    if (!json.startsWith('{')) {
      json = decodeURIComponent(atob(json));
    }
    const parsed = JSON.parse(json);
    if (parsed && Array.isArray(parsed.exams) && Array.isArray(parsed.bankQuestions)) {
      return parsed as AppData;
    }
  } catch (e) {
    console.error('Failed to import sync code', e);
  }
  return null;
}

export function exportSubmissionsToCSV(submissions: Submission[]): void {
  const headers = ['ID Submisi', 'Nama Siswa', 'Kelas', 'Username', 'Judul Ujian', 'Nilai Akhir', 'Status', 'Jumlah Pelanggaran', 'Waktu Pengumpulan', 'Durasi (Menit)'];
  const rows = submissions.map(sub => [
    `"${sub.id}"`,
    `"${sub.studentName.replace(/"/g, '""')}"`,
    `"${(sub.studentClass || '-').replace(/"/g, '""')}"`,
    `"${sub.studentUsername}"`,
    `"${sub.examTitle.replace(/"/g, '""')}"`,
    sub.score,
    `"${sub.status}"`,
    sub.violations,
    `"${sub.submittedAt}"`,
    Math.round(sub.durationSpentSeconds / 60)
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Rekap_Nilai_CBT_Informatika_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Advanced parser for imported questions (.docx extracted text, .txt, pasted text)
export function parseRawQuestionText(
  text: string,
  subject: string = 'INFORMATIKA',
  classLevel: string = 'Kelas 7',
  teacherUsername?: string,
  teacherName?: string
): Question[] {
  if (!text || !text.trim()) return [];

  // Normalize line endings and clean invisible artifacts
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

  const rawLines = normalizedText.split('\n').map((l) => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return [];

  interface QuestionDraft {
    questionLines: string[];
    options: { label: string; text: string }[];
    answer?: string;
    score?: number;
    hasExplicitNumber?: boolean;
    questionNumber?: number;
  }

  const drafts: QuestionDraft[] = [];
  let currentDraft: QuestionDraft | null = null;
  let pendingStimulusLines: string[] = [];

  // Strict Question number regex:
  // e.g. "1. ", "1) ", "No. 1. ", "Soal 1: ", "Nomor 25. "
  // MUST be followed by whitespace, NOT digits (so 15.000 or Rp 15.000 does NOT match!)
  const questionNumberRegex = /^(?:(?:soal|no(?:mor)?\.?)\s*)?\(?(\d{1,3})\)?[\.\)\:\-]\s+(.*)$/i;

  // Option regex: A. , A) , (A) , a.
  const optionStartRegex = /^[\(\[]?([A-Ea-e])[\)\]\.\:]\s*(.*)$/;

  // Answer key regex: Kunci: A, Kunci Jawaban: B, Jawaban: C, Key: D
  const answerKeyRegex = /^(?:kunci(?:\s*jawaban)?|jawaban(?:\s*benar)?|jawab|ans(?:wer)?|key)\s*[:=\-]?\s*(.+)$/i;

  // Detect table rows or stimulus lines
  const isTableLine = (l: string) => {
    if (l.includes('\t')) return true;
    if (l.includes('|') && l.split('|').filter(Boolean).length >= 2) return true;
    // Multi-column spaced line (e.g. "Jepit Pita   Pink   4   Rambut   Rp 15.000")
    if (l.split(/\s{2,}|\t/).map(s => s.trim()).filter(Boolean).length >= 3) return true;
    return false;
  };

  const isStimulusHeader = (l: string) => {
    return /^perhatikan\s+(?:tabel|gambar|grafik|diagram|wacana|bacaan|teks|cerita|katalog|kode|potongan)/i.test(l);
  };

  const finalizeDraft = () => {
    if (currentDraft) {
      // Only keep if it has options OR has an explicit question number with content
      const hasOptions = currentDraft.options.length >= 2;
      const hasNumberAndContent = Boolean(currentDraft.hasExplicitNumber && currentDraft.questionLines.length > 0);
      if (hasOptions || hasNumberAndContent) {
        drafts.push(currentDraft);
      } else if (currentDraft.questionLines.length > 0) {
        // Might be a stimulus block for the next question
        pendingStimulusLines.push(...currentDraft.questionLines);
      }
    }
    currentDraft = null;
  };

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];

    // 1. Check if line is an answer key (e.g. "Kunci: A" or "Kunci Jawaban: B")
    const ansMatch = rawLine.match(answerKeyRegex);
    if (ansMatch) {
      if (currentDraft) {
        const rawAns = ansMatch[1].trim();
        const letterMatch = rawAns.match(/^[A-Ea-e]/);
        if (letterMatch) {
          const letter = letterMatch[0].toUpperCase();
          currentDraft.answer = String(letter.charCodeAt(0) - 65);
        } else {
          currentDraft.answer = rawAns;
        }
      }
      continue;
    }

    // 2. Check if line contains inline multiple options (e.g. "A. Opsi Satu  B. Opsi Dua  C. Opsi Tiga  D. Opsi Empat")
    const inlineOptions = rawLine
      .split(/(?=(?:^|\s{2,}|\t|\s+)[A-Ea-e][\.\)\:]\s+)/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (inlineOptions.length > 1 && inlineOptions.every((io) => optionStartRegex.test(io))) {
      if (!currentDraft) {
        currentDraft = {
          questionLines: pendingStimulusLines.splice(0, pendingStimulusLines.length),
          options: [],
        };
      }
      for (const io of inlineOptions) {
        const optMatch = io.match(optionStartRegex);
        if (optMatch) {
          const label = optMatch[1].toUpperCase();
          let optText = optMatch[2].trim();
          // Check if option is marked as correct answer: e.g. *A. or (Kunci)
          if (io.startsWith('*') || optText.startsWith('*') || /\((?:kunci|benar)\)$/i.test(optText)) {
            currentDraft.answer = String(label.charCodeAt(0) - 65);
            optText = optText.replace(/\s*\((?:kunci|benar)\)$/i, '').replace(/^\*\s*/, '');
          }
          currentDraft.options.push({ label, text: optText });
        }
      }
      continue;
    }

    // 3. Check if line is a single option (A. Opsi ...)
    const optMatch = rawLine.match(optionStartRegex);
    if (optMatch && !isTableLine(rawLine)) {
      const label = optMatch[1].toUpperCase();
      let optText = optMatch[2].trim();

      // Check if option is marked as answer with asterisk or (Kunci)
      const hasKeyMark =
        rawLine.startsWith('*') || optText.startsWith('*') || /\((?:kunci|benar)\)$/i.test(optText);
      if (hasKeyMark) {
        optText = optText.replace(/\s*\((?:kunci|benar)\)$/i, '').replace(/^\*\s*/, '');
      }

      // If current draft already has option with this label (e.g. encountered another 'A'),
      // it means a new question started!
      if (currentDraft && currentDraft.options.some((o) => o.label === label)) {
        finalizeDraft();
      }

      if (!currentDraft) {
        currentDraft = {
          questionLines: pendingStimulusLines.splice(0, pendingStimulusLines.length),
          options: [],
        };
      }
      if (hasKeyMark) {
        currentDraft.answer = String(label.charCodeAt(0) - 65);
      }
      currentDraft.options.push({ label, text: optText });
      continue;
    }

    // 4. Check if line is a Stimulus Header (e.g. "Perhatikan Tabel Katalog Aksesori berikut...")
    if (isStimulusHeader(rawLine)) {
      // If we already have a finished draft with options, finalize it first
      if (currentDraft && currentDraft.options.length > 0) {
        finalizeDraft();
      }
      if (!currentDraft) {
        currentDraft = {
          questionLines: pendingStimulusLines.splice(0, pendingStimulusLines.length),
          options: [],
        };
      }
      currentDraft.questionLines.push(rawLine);
      continue;
    }

    // 5. Check if line is a Table row or diagram text
    if (isTableLine(rawLine)) {
      if (!currentDraft) {
        currentDraft = {
          questionLines: pendingStimulusLines.splice(0, pendingStimulusLines.length),
          options: [],
        };
      }
      currentDraft.questionLines.push(rawLine);
      continue;
    }

    // 6. Check if line is a question header (e.g. "1. Proses memecahkan masalah..." or "25. Berdasarkan tabel...")
    const qNumMatch = !isTableLine(rawLine) && !rawLine.startsWith('Rp') ? rawLine.match(questionNumberRegex) : null;
    if (qNumMatch) {
      const qNum = parseInt(qNumMatch[1], 10);
      const qBody = qNumMatch[2].trim();

      // Only treat as question number if within reasonable exam number range (1 - 250)
      if (qNum >= 1 && qNum <= 250) {
        // If current draft already has options, finalize it
        if (currentDraft && currentDraft.options.length > 0) {
          finalizeDraft();
        }

        const initialLines = pendingStimulusLines.splice(0, pendingStimulusLines.length);
        if (currentDraft && currentDraft.options.length === 0) {
          // If current draft had introductory stimulus text or table, keep it!
          initialLines.push(...currentDraft.questionLines);
        }

        currentDraft = {
          questionLines: [...initialLines, qBody || rawLine],
          options: [],
          hasExplicitNumber: true,
          questionNumber: qNum,
        };
        continue;
      }
    }

    // 7. Text lines while draft has no options yet: append to question body
    if (currentDraft && currentDraft.options.length === 0) {
      currentDraft.questionLines.push(rawLine);
      continue;
    }

    // 8. Text line after options were collected:
    // Check if it's an explanation line or notes
    if (currentDraft && currentDraft.options.length > 0) {
      if (/^(?:pembahasan|penjelasan|catatan|note|sumber)\s*[:\-]/i.test(rawLine)) {
        continue; // skip explanation header or store if needed
      }
      // If next line might be a stimulus for the following question, finalize current
      finalizeDraft();
      pendingStimulusLines.push(rawLine);
      continue;
    }

    // Fallback: add to pending stimulus or new draft
    pendingStimulusLines.push(rawLine);
  }

  finalizeDraft();

  // If there are still pending stimulus lines and we have drafts, attach them to the nearest draft or fallback
  if (drafts.length === 0 && normalizedText.length > 0) {
    drafts.push({
      questionLines: [normalizedText],
      options: [
        { label: 'A', text: 'Opsi A' },
        { label: 'B', text: 'Opsi B' },
        { label: 'C', text: 'Opsi C' },
        { label: 'D', text: 'Opsi D' },
      ],
      answer: '0',
    });
  }

  // Convert drafts to final Question objects
  const result: Question[] = [];
  const baseScore = drafts.length > 0 ? Math.max(1, Math.round(100 / drafts.length)) : 25;

  drafts.forEach((draft, idx) => {
    // Join question lines with newline \n so tables, paragraphs, and diagrams retain formatting!
    const questionText = draft.questionLines.join('\n').trim() || `Soal Nomor ${idx + 1}`;
    const optionTexts = draft.options.map((o) => o.text);

    let qType: 'pg' | 'bs' | 'isian' | 'uraian' = 'pg';
    let finalAnswer = draft.answer !== undefined ? draft.answer : '0';

    if (optionTexts.length >= 2) {
      // Check if it's Benar / Salah
      const lowerOpts = optionTexts.map((o) => o.toLowerCase());
      if (
        (lowerOpts.includes('benar') && lowerOpts.includes('salah')) ||
        (lowerOpts.includes('true') && lowerOpts.includes('false'))
      ) {
        qType = 'bs';
        if (!draft.answer) finalAnswer = 'Benar';
      } else {
        qType = 'pg';
        // If answer was specified by text rather than letter index:
        if (draft.answer && isNaN(Number(draft.answer))) {
          const matchIdx = optionTexts.findIndex(
            (o) => o.toLowerCase() === draft.answer!.toLowerCase()
          );
          if (matchIdx !== -1) {
            finalAnswer = String(matchIdx);
          }
        }
      }
    } else if (
      questionText.toLowerCase().includes('jelaskan') ||
      questionText.toLowerCase().includes('uraikan') ||
      questionText.toLowerCase().includes('mengapa')
    ) {
      qType = 'uraian';
      finalAnswer = draft.answer || 'Evaluasi guru';
    } else {
      qType = 'isian';
      finalAnswer = draft.answer || 'Kunci isian';
    }

    result.push({
      id: `bq-import-${Date.now()}-${idx + 1}`,
      subject,
      classLevel,
      type: qType,
      question: questionText,
      options: qType === 'pg' || qType === 'bs' ? optionTexts : [],
      answer: finalAnswer,
      score: baseScore,
      teacherUsername,
      teacherName,
    });
  });

  return result;
}
