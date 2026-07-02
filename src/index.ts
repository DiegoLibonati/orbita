import "@/index.css";
import OrbitaPage from "@/pages/OrbitaPage/OrbitaPage";

const onInit = (): void => {
  const app = document.querySelector<HTMLDivElement>("#app");

  if (!app) throw new Error(`You must render a container to mount the app.`);

  const orbitaPage = OrbitaPage();
  app.replaceChildren(orbitaPage);
};

document.addEventListener("DOMContentLoaded", onInit);
