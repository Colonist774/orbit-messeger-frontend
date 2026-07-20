function DeleteMessageModal({
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) {
    return null;
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  }

  return (
    <div
      className="delete-modal-backdrop"
      onMouseDown={handleBackdropClick}
    >
      <div
        className="delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <h2
          id="delete-modal-title"
          className="delete-modal__title"
        >
          Удалить сообщение?
        </h2>

        <p className="delete-modal__text">
          Вы действительно хотите удалить сообщение?
          Это действие нельзя отменить.
        </p>

        <div className="delete-modal__actions">
          <button
            type="button"
            className="delete-modal__button delete-modal__button--cancel"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Отмена
          </button>

          <button
            type="button"
            className="delete-modal__button delete-modal__button--delete"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting
              ? "Удаление..."
              : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteMessageModal;