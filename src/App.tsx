import { PetWidget } from "./components/PetWidget";
import { useAppConfig } from "./hooks/useAppConfig";
import "./App.css";

function App() {
  const { showPet, theme, isSoundsEnabled } = useAppConfig();

  return (
    <main className={`container theme-${theme}`}>
      {showPet && (
        <PetWidget
          petName="owl"
          initialX={window.innerWidth / 2 - 75}
          isSoundsEnabled={isSoundsEnabled}
        />
      )}
    </main>
  );
}

export default App;
