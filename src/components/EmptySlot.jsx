function EmptySlot({ onClick }) {
  return (
    <button className="empty-slot" onClick={onClick} aria-label="포켓몬 추가">
      <span className="empty-slot__icon">+</span>
      <span className="empty-slot__text">포켓몬 추가</span>
    </button>
  );
}

export default EmptySlot;
