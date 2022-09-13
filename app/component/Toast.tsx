interface IProps {
  error?: boolean
}

export const Toast: React.FC<IProps> = ({error = false, ...props}) => {
  return (
    <div className={`toast pf ${error ? 'error': ''}`}>{props.children}</div>
  )
}
