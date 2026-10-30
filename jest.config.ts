import type { Config } from "jest";
import nextJest from "next/jest.js";

// next/jest compile le TypeScript avec SWC (déjà fourni par Next) et résout l'alias @/.
const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "node", // on ne teste que de la logique serveur (lib/), pas de DOM
};

export default createJestConfig(config);
