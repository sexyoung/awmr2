import React from 'react';

// import styles from './style.scss';

interface IProps {
  total?: number;
  success?: number,
  notRecord?: number;
  z: number;
}

const RecordBar:React.FC<IProps> = ({success = 0, notRecord = 0, total = 0, z = 0}) => {
  const notYet = total - success - notRecord;
  const percentage = {
    notYet: ~~(notYet / total * 100),
    success: ~~(success / total * 100),
    notRecord: ~~(notRecord / total * 100),
  };
  return (
    <div className='record-bar' style={{zIndex: z}}>
      {!!success &&
        <div
          data-text={`登記: ${success}`}
          style={{ width: `${percentage.success}%`}}
          className='success' />
      }
      {!!notRecord &&
        <div
          data-text={`異常: ${notRecord}`}
          style={{ width: `${percentage.notRecord}%`}}
          className='notRecord' />
      }
      {!!notYet &&
        <div
          data-text={`未登: ${notYet}`}
          style={{ width: `${percentage.notYet}%`}}
        />
      }
    </div>
  );
}

export default RecordBar;