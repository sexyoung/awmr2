import { useParams } from "@remix-run/react"

const UploadPage = () => {
  const params = useParams();
  return (
    <div>
      <h2>上傳水錶頁</h2>
      {params.projectId}
    </div>
  )
}

export default UploadPage