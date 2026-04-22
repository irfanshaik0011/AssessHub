import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { 
  collection, query, getDocs, doc, updateDoc, where, 
  setDoc, serverTimestamp, Timestamp, getDoc, deleteDoc 
} from 'firebase/firestore';

export interface Exam {
  id: string;
  title: string;
  duration: number;
  faculty_id: string;
  faculty_name: string;
  is_published: boolean;
  is_active: boolean;
  is_deleted?: boolean;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
  start_time: any;
  end_time: any;
  created_at: any;
  questions_per_student?: number;
  easy_count?: number;
  medium_count?: number;
  hard_count?: number;
  score_easy?: number;
  score_medium?: number;
  score_hard?: number;
  total_score?: number;
  assigned_questions?: any[];
}

export const useExams = (readonly: boolean) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Record<string, any>>({});
  const [distributingId, setDistributingId] = useState<string | null>(null);
  const [startingExamId, setStartingExamId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchExams();
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, [user]);

  const fetchExams = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const examsRef = collection(db, 'exams');
      let q;
      
      if (readonly) {
        q = query(
          examsRef, 
          where('status', '==', 'approved'),
          where('is_active', '==', true)
        );
      } else {
        q = query(examsRef, where('faculty_id', '==', user.id));
      }

      const querySnapshot = await getDocs(q);
      const examsData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Exam))
        .filter(e => !e.is_deleted);
      
      examsData.sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
      
      const filteredExams = readonly ? examsData.filter(exam => {
        const data = exam as any;
        const branchMatch = !data.target_branch || data.target_branch === 'ALL' || data.target_branch === user.branch;
        const yearMatch = !data.target_year || data.target_year === 'ALL' || data.target_year === user.year;
        const sectionMatch = !data.target_section || data.target_section === 'ALL' || data.target_section === user.section;
        return branchMatch && yearMatch && sectionMatch;
      }) : examsData;

      setExams(filteredExams);

      if (user.role === 'student') {
        const attemptsQuery = query(
          collection(db, 'attempts'),
          where('student_id', '==', user.id)
        );
        const attemptsSnap = await getDocs(attemptsQuery);
        const attemptsMap: Record<string, any> = {};
        attemptsSnap.docs.forEach(d => {
          const data = d.data();
          if (data.status !== 'DELETED') {
            attemptsMap[data.exam_id] = { id: d.id, ...data };
          }
        });
        setAttempts(attemptsMap);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (examId: string, current: boolean) => {
    await updateDoc(doc(db, 'exams', examId), { is_active: !current });
    setExams(prev => prev.map(e => e.id === examId ? { ...e, is_active: !current } : e));
  };

  const togglePublish = async (examId: string, current: boolean) => {
    await updateDoc(doc(db, 'exams', examId), { is_published: !current });
    setExams(prev => prev.map(e => e.id === examId ? { ...e, is_published: !current } : e));
  };

  const deleteExam = async (examId: string) => {
    try {
      await updateDoc(doc(db, 'exams', examId), { is_deleted: true });
      setExams(prev => prev.filter(e => e.id !== examId));
    } catch (error) {
      console.error('Delete failed:', error);
      throw error;
    }
  };

  const distributeQuestions = async (examId: string) => {
    setDistributingId(examId);
    try {
      const examDoc = await getDoc(doc(db, 'exams', examId));
      if (!examDoc.exists()) return;
      const examData = examDoc.data() as Exam;
      const { 
        easy_count = 0, medium_count = 0, hard_count = 0, 
        questions_per_student = 0
      } = examData;

      if (questions_per_student === 0 || (easy_count + medium_count + hard_count) !== questions_per_student) {
        alert('Please configure and save a valid question distribution first.');
        return;
      }

      const bankSnap = await getDoc(doc(db, 'exams', examId, 'question_data', 'bank'));
      const allQuestions = bankSnap.exists() ? (bankSnap.data().questions || []) : [];

      const easyPool = allQuestions.filter((q: any) => q.difficulty === 'easy');
      const mediumPool = allQuestions.filter((q: any) => q.difficulty === 'medium');
      const hardPool = allQuestions.filter((q: any) => q.difficulty === 'hard');

      if (easyPool.length < easy_count || mediumPool.length < medium_count || hardPool.length < hard_count) {
        alert(`Insufficient questions in pools. Easy: ${easyPool.length}/${easy_count}, Medium: ${mediumPool.length}/${medium_count}, Hard: ${hardPool.length}/${hard_count}`);
        return;
      }

      // We just mark it as "ready" for students to start
      await updateDoc(doc(db, 'exams', examId), {
        status: 'approved',
        updated_at: serverTimestamp()
      });

      alert(`Exam distribution settings validated. Students will receive unique shuffled questions upon starting.`);
    } catch (error) {
      console.error('Distribution error:', error);
      alert('Failed to distribute questions.');
    } finally {
      setDistributingId(null);
    }
  };

  const startExam = async (exam: Exam) => {
    if (!user) return;
    setStartingExamId(exam.id);
    try {
      const expiresAt = new Date(Date.now() + exam.duration * 60000);
      
      // 1. Fetch the question bank
      const bankSnap = await getDoc(doc(db, 'exams', exam.id, 'question_data', 'bank'));
      if (!bankSnap.exists()) {
        alert('Question bank not found. Please contact faculty.');
        return;
      }
      const allQuestions = bankSnap.data().questions || [];

      // 2. Perform random allocation based on exam settings
      const { 
        easy_count = 0, medium_count = 0, hard_count = 0,
        score_easy = 1, score_medium = 2, score_hard = 3
      } = exam;

      const easyPool = allQuestions.filter((q: any) => q.difficulty === 'easy');
      const mediumPool = allQuestions.filter((q: any) => q.difficulty === 'medium');
      const hardPool = allQuestions.filter((q: any) => q.difficulty === 'hard');

      const shuffle = (arr: any[]) => [...arr].sort(() => 0.5 - Math.random());
      
      const selectedEasy = shuffle(easyPool).slice(0, easy_count).map(q => ({ ...q, score: score_easy }));
      const selectedMedium = shuffle(mediumPool).slice(0, medium_count).map(q => ({ ...q, score: score_medium }));
      const selectedHard = shuffle(hardPool).slice(0, hard_count).map(q => ({ ...q, score: score_hard }));
      
      // 3. Combine and shuffle the final set for the student
      const assignedQuestions = shuffle([...selectedEasy, ...selectedMedium, ...selectedHard]);
      const totalScore = assignedQuestions.reduce((acc, q) => acc + (q.score || 0), 0);

      if (assignedQuestions.length === 0) {
        alert('No questions allocated. Please contact faculty.');
        return;
      }

      const attemptId = Math.random().toString(36).substr(2, 9);
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const staticSnapshotUrl = `https://res.cloudinary.com/${cloudName}/image/upload/snapshots/${attemptId}.jpg`;

      await setDoc(doc(db, 'attempts', attemptId), {
        id: attemptId,
        exam_id: exam.id,
        exam_title: exam.title,
        faculty_id: exam.faculty_id,
        faculty_name: exam.faculty_name,
        student_id: user.id,
        student_name: user.name,
        student_email: user.email,
        student_roll_number: user.rollNumber || 'N/A',
        student_branch: user.branch || 'N/A',
        student_section: user.section || 'N/A',
        status: 'IN_PROGRESS',
        started_at: serverTimestamp(),
        expires_at: Timestamp.fromDate(expiresAt),
        total_exam_score: totalScore,
        assigned_questions: assignedQuestions, // Store the unique set here
        live_snapshot: staticSnapshotUrl
      });

      navigate(`/exam/${exam.id}/${attemptId}`);
    } catch (error) {
      console.error('Failed to start exam:', error);
      alert('Failed to start exam. Please try again.');
    } finally {
      setStartingExamId(null);
    }
  };

  const forceSubmit = async (attemptId: string) => {
    try {
      await updateDoc(doc(db, 'attempts', attemptId), {
        status: 'AUTO_SUBMITTED',
        submitted_at: serverTimestamp(),
        force_submitted_by_faculty: true
      });
    } catch (error) {
      console.error('Force submit failed:', error);
      throw error;
    }
  };

  const restartAttempt = async (attemptId: string) => {
    try {
      await deleteDoc(doc(db, 'attempts', attemptId));
    } catch (error) {
      console.error('Restart failed:', error);
      throw error;
    }
  };

  const resumeAttempt = async (attemptId: string, additionalMinutes: number = 10) => {
    try {
      const newExpiresAt = new Date(Date.now() + additionalMinutes * 60000);
      await updateDoc(doc(db, 'attempts', attemptId), {
        status: 'IN_PROGRESS',
        expires_at: Timestamp.fromDate(newExpiresAt),
        resumed_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Resume failed:', error);
      throw error;
    }
  };

  return { 
    exams, loading, attempts, distributingId, startingExamId, currentTime,
    toggleActive, togglePublish, deleteExam, distributeQuestions, startExam,
    forceSubmit, restartAttempt, resumeAttempt
  };
};