import { test as base } from "@playwright/test";
import { pageFixtures, type PageFixtures } from "./page.fixtures";

type MyFixtures = PageFixtures;

export const test = base.extend<MyFixtures>({
  ...pageFixtures,
});

export { expect } from "@playwright/test";
