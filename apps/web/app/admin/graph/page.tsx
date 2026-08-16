import { redirect } from "next/navigation";

// 保留旧链接跳转，唯一治理入口为 /admin/knowledge-bases/graph。
export default function AdminGraphLegacyRoute() {
  redirect("/admin/knowledge-bases/graph");
}
