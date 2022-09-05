interface IProps {
}

export const Toast: React.FC<IProps> = (props) => {
  return (
    <div className="toast pf">{props.children}</div>
  )
}
