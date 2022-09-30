import { FC, useState } from 'react';
import imageCompression from 'browser-image-compression';

// import * as API from "api";
// import style from './style.module.css';

// const { REACT_APP_API_DOMAIN: API_DOMAIN } = process.env;
const API_DOMAIN = '/';

const toBase64 = (file: File) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

interface IAvatar {
  id: number;
  picture: string | null;
  afterChange?: () => void;
}

export const Avator: FC<IAvatar> = (props) => {
  const [preview, setPreview] = useState<string>();
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files![0];
    const formData = new FormData();
    const blob = await imageCompression(file, {maxSizeMB: 0.1, maxWidthOrHeight: 900});
    // setPreview(await toBase64(blob) as string);
    formData.append("image", blob);
    formData.append("id", props.id.toString());

    await fetch(`/d/user/upload-avatar`, {
      method: 'post',
      body: formData,
    });

    // setPreview(image);

    props.afterChange && props.afterChange();
  };
  return (
    <label className="avatar db tac m0a">
      {props.picture &&
        <div className="img m0a" style={{backgroundImage: `url(/avatar/${props.picture})`}} />
      }
      <div className="btn primary dib">{preview ? '上傳中...': '上傳照片'}</div>
      {!preview && <input className="dn" type="file" onChange={handleUpload} accept="image/*" />}
    </label>
  );
};
