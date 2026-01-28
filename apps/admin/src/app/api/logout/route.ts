import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear the auth-token cookie server-side
  response.cookies.set("auth-token", "", {
    expires: new Date(0),
    path: "/",
  });

  return response;
}
