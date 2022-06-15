import { useParams } from "@remix-run/react"

const projectExportPage = () => {
  const params = useParams();
  return (
    <div>
      <h2>標案匯出頁</h2>
      {params.projectId}
    </div>
  )
}

export default projectExportPage