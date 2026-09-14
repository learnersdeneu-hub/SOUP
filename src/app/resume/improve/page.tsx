import { redirect } from "next/navigation";

export default function ImproveResumePage() {
  redirect("/resume?improve=1");
}
