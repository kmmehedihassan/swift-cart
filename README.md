#### 1) What is the difference between `null` and `undefined`?
- আমরা যখন কোনো variable declare করি, কিন্তু value assign করি না, তখন সেটি `undefined` দেখায়। এবং আমরা ইচ্ছা করে যখন empty value দেই, তখন `null` ব্যবহার করি।

#### 2) What is the use of the `map()` function in JavaScript? How is it different from `forEach()`?
- `map()` data transform করার জন্য নতুন array return করে, এবং শুধু loop করার জন্য `forEach()` Use হয়, কিন্তু কিছু return করে না.

#### 3) What is the difference between `==` and `===`?
- `==` শুধু value check করে, `===` value and type দুটোই check করে.

#### 4) What is the significance of `async`/`await` in fetching API data?
- API থেকে data সাথে সাথে আসে না, সময় লাগে. async/await ব্যবহার করলে API থেকে data আনার সময় code wait করে এবং synchronous এর মতো clean ও readable ভাবে লেখা যায়। তাই asynchronous কাজ সহজে handle করা যায়।

#### 5) Explain the concept of Scope in JavaScript (Global, Function, Block).
- variable কোথা থেকে access করছে তাকেই Scope বলে. তিন ধরনের স্কোপ আছে Global Scope, Function Scope, and Block Scope. 
- Global  সব জায়গা থেকে access করা যায়.
- Function Scope শুধুমাত্র Function ভিতর থেকে access করা যায়.
- Block Scope {}  ভিতর থেকে access করা যায়.
