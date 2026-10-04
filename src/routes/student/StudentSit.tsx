import { useParams } from 'react-router-dom'
import SitExam from '../cbt/SitExam'

export default function StudentSit() {
  const { examId } = useParams()
  if (!examId) return null
  return <SitExam examId={examId} />
}
