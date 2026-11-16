# Code toolbar fixtures (not a public page)

These fences are rendered in tests via the Expressive Code engine, not shipped as a /dev route.

```bash title="网关 · 从官方 apt 源安装 sing-box"
mkdir -p /etc/apt/keyrings
curl -fsSL https://example.com/gpg.key -o key.asc
```

```js title="src/hello.ts"
export const hello = (name = 'world') => {
  return `hello, ${name}`;
};
```

```js
const total = [1, 2, 3].reduce((sum, n) => sum + n, 0);
console.log(total);
```

```
this block has no fence language
it should still show a language tag and a copy button
```

```bash title="VPS · docker-compose.yml（节选，含服务、网络与挂载说明，用来检查窄屏省略号）"
echo "truncate the title, keep BASH and copy visible"
```

```js wrap=false title="一行很长、关闭换行的示例"
const url =
  'https://example.com/api/v1/widgets?limit=100&sort=name&fields=id,name,createdAt,updatedAt,owner,labels,description';
```

```bash frame="terminal" title="示例终端"
echo "hello from a terminal frame"
ls -la
```
