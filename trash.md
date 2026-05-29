src/main/proxy/ProxyServer.ts:
```
1. 'head' is declared but its value is never read. | 186 | this.proxy.onConnect((req: any, socket: any, head: any, callback: any) => {
2. 'ctx' is declared but its value is never read. | 568 | ctx.onRequestData((ctx: any, chunk: any, callback: any) => {
3. 'ctx' is declared but its value is never read. | 573 | ctx.onRequestEnd(async (ctx: any, callback: any) => {
4. 'await' expressions are only allowed within async functions and at the top levels of modules. | 675 | await new Promise<void>((resolve, reject) => {
5. 'ctx' is declared but its value is never read. | 713 | ctx.onResponseData((ctx: any, chunk: any, callback: any) => {
```
<-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=->