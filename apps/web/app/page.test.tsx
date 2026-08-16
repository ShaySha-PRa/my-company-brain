import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "./page.tsx";

describe("web public shell", () => {
  test("renders the branded public knowledge experience", () => {
    const markup = renderToStaticMarkup(<HomePage />);
    expect(markup).toContain("My Company Brain · 企业知识中台");
    expect(markup).toContain("让企业知识");
    expect(markup).toContain("可问 · 可信 · 可管");
  });
});
