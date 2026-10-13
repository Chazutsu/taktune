import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { setDefaultLocale } from "../src/ui/i18n";

setDefaultLocale("ja");

afterEach(() => cleanup());
