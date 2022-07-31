import { createRef, useEffect } from 'react';

const modalBG = createRef<HTMLDivElement>();

interface IProps {
  onClose?: any;
  className?: string;
}

const Modal:React.FC<IProps> = ({ children, onClose, className = '' }) => {

  useEffect(() => {
    const body = document.getElementsByTagName('body')[0];
    body.setAttribute(
      "style",
      "overflow: hidden"
    );
    return () => {
      body.setAttribute("style", "");
    };
  }, []);
  const handleClick: React.MouseEventHandler<HTMLDivElement>  = e => {
    if(e.target === modalBG.current) {
      onClose && onClose();
    }
  };
  
  return (
    <div data-testid="modalBG" className={`ModalBG ${className}`} ref={modalBG} onClick={handleClick}>
      <div data-testid="modal" className='Modal'>
        {children}
      </div>
    </div>
  );
}

export default Modal;