export const useToast = () => {
  const emit = (type, message) => {
    try {
      window.dispatchEvent(new CustomEvent("app-toast", { detail: { type, message } }));
    } catch (e) {
      // fallback: console
      // eslint-disable-next-line no-console
      console.log(type, message);
    }
  };

  return {
    success: (msg) => emit("success", msg),
    error: (msg) => emit("error", msg),
    info: (msg) => emit("info", msg),
  };
};
