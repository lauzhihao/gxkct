export async function GET() {
  // 后端 Spring Boot SSE 地址
  const backendUrl = "http://localhost:38080/api/chat/sse";

  // 向后端发起请求（保持流模式）
  const backendResponse = await fetch(backendUrl, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });

  // 关键：将流直接 pipe 返回给前端
  const { readable, writable } = new TransformStream();
  backendResponse.body.pipeTo(writable);

  // 返回 SSE 流给浏览器
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
    },
  });
}