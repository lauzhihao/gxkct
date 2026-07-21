"""项目结构映射脚本.

扫描指定目录中的源代码文件，利用 AST/正则提取结构信息，
生成 PROJECT_MAP.md 文件，包含文件树、类/函数签名摘要及行数统计。

支持的文件类型:
- Python: .py
- Java: .java
- TypeScript/React: .ts, .tsx, .js, .jsx
- Vue: .vue
"""

import argparse
import ast
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


# ---------------------------------------------------------------------------
# 数据结构定义
# ---------------------------------------------------------------------------


@dataclass
class FunctionInfo:
    """函数/方法签名信息."""

    name: str
    params: str
    return_type: str = ""
    is_async: bool = False
    decorators: list[str] = field(default_factory=list)


@dataclass
class ClassInfo:
    """类结构信息."""

    name: str
    bases: list[str] = field(default_factory=list)
    methods: list[FunctionInfo] = field(default_factory=list)
    decorators: list[str] = field(default_factory=list)


@dataclass
class PropsInfo:
    """React 组件 Props 定义."""

    name: str
    fields: list[str] = field(default_factory=list)


@dataclass
class FileInfo:
    """单个文件的结构信息."""

    path: Path
    line_count: int = 0
    classes: list[ClassInfo] = field(default_factory=list)
    functions: list[FunctionInfo] = field(default_factory=list)
    props: list[PropsInfo] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Python AST 解析器
# ---------------------------------------------------------------------------


class PythonAnalyzer:
    """使用 ast 模块解析 Python 文件结构."""

    def analyze(self, file_path: Path) -> FileInfo:
        """解析单个 Python 文件.

        Args:
            file_path: Python 文件路径.

        Returns:
            FileInfo: 文件结构信息.
        """
        source = file_path.read_text(encoding="utf-8")
        line_count = len(source.splitlines())
        info = FileInfo(path=file_path, line_count=line_count)

        try:
            tree = ast.parse(source)
        except SyntaxError:
            return info

        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.ClassDef):
                info.classes.append(self._extract_class(node))
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                info.functions.append(self._extract_function(node))

        return info

    def _extract_class(self, node: ast.ClassDef) -> ClassInfo:
        """提取类信息.

        Args:
            node: AST 类定义节点.

        Returns:
            ClassInfo: 类结构信息.
        """
        bases = [self._get_annotation_str(b) for b in node.bases]
        decorators = [self._get_annotation_str(d) for d in node.decorator_list]
        methods = []

        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                methods.append(self._extract_function(item))

        return ClassInfo(
            name=node.name,
            bases=bases,
            methods=methods,
            decorators=decorators,
        )

    def _extract_function(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> FunctionInfo:
        """提取函数签名.

        Args:
            node: AST 函数定义节点.

        Returns:
            FunctionInfo: 函数签名信息.
        """
        params = self._format_params(node.args)
        return_type = self._get_annotation_str(node.returns) if node.returns else ""
        decorators = [self._get_annotation_str(d) for d in node.decorator_list]
        is_async = isinstance(node, ast.AsyncFunctionDef)

        return FunctionInfo(
            name=node.name,
            params=params,
            return_type=return_type,
            is_async=is_async,
            decorators=decorators,
        )

    def _format_params(self, args: ast.arguments) -> str:
        """格式化函数参数列表.

        Args:
            args: AST 参数节点.

        Returns:
            str: 格式化后的参数签名字符串.
        """
        parts = []
        defaults_offset = len(args.args) - len(args.defaults)

        for i, arg in enumerate(args.args):
            if arg.arg == "self" or arg.arg == "cls":
                continue
            param_str = arg.arg
            if arg.annotation:
                param_str += f": {self._get_annotation_str(arg.annotation)}"
            default_idx = i - defaults_offset
            if default_idx >= 0 and default_idx < len(args.defaults):
                param_str += " = ..."
            parts.append(param_str)

        if args.vararg:
            vararg_str = f"*{args.vararg.arg}"
            if args.vararg.annotation:
                vararg_str += f": {self._get_annotation_str(args.vararg.annotation)}"
            parts.append(vararg_str)

        for i, arg in enumerate(args.kwonlyargs):
            param_str = arg.arg
            if arg.annotation:
                param_str += f": {self._get_annotation_str(arg.annotation)}"
            if i < len(args.kw_defaults) and args.kw_defaults[i] is not None:
                param_str += " = ..."
            parts.append(param_str)

        if args.kwarg:
            kwarg_str = f"**{args.kwarg.arg}"
            if args.kwarg.annotation:
                kwarg_str += f": {self._get_annotation_str(args.kwarg.annotation)}"
            parts.append(kwarg_str)

        return ", ".join(parts)

    def _get_annotation_str(self, node: ast.expr | None) -> str:
        """将 AST 注解节点转为可读字符串.

        Args:
            node: AST 表达式节点.

        Returns:
            str: 注解的字符串表示.
        """
        if node is None:
            return ""
        try:
            return ast.unparse(node)
        except (ValueError, AttributeError):
            return "?"


# ---------------------------------------------------------------------------
# TSX 解析器（基于正则，无需外部依赖）
# ---------------------------------------------------------------------------


class TsxAnalyzer:
    """使用正则表达式解析 TSX 文件结构."""

    # 匹配 interface/type Props 定义
    _PROPS_PATTERN = re.compile(
        r"(?:interface|type)\s+([\w]+Props)\s*(?:=\s*)?\{([^}]*)\}",
        re.MULTILINE | re.DOTALL,
    )

    # 匹配函数组件声明
    _FUNC_COMPONENT_PATTERN = re.compile(
        r"(?:export\s+)?(?:default\s+)?(?:const|function)\s+"
        r"(\w+)\s*(?::\s*React\.FC<(\w+)>)?\s*"
        r"(?:=\s*)?(?:\(([^)]*)\))?",
        re.MULTILINE,
    )

    # 匹配类组件
    _CLASS_PATTERN = re.compile(
        r"(?:export\s+)?(?:default\s+)?class\s+(\w+)\s+"
        r"extends\s+(?:React\.)?Component<([^>]*)>",
        re.MULTILINE,
    )

    # 匹配普通 export function
    _EXPORT_FUNC_PATTERN = re.compile(
        r"(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)"
        r"(?:\s*:\s*([^\s{]+))?",
        re.MULTILINE,
    )

    # 匹配 export const 箭头函数
    _ARROW_FUNC_PATTERN = re.compile(
        r"(?:export\s+)?const\s+(\w+)\s*"
        r"(?::\s*([^=]+?)\s*)?=\s*(?:async\s+)?\(([^)]*)\)"
        r"(?:\s*:\s*([^\s=>]+))?\s*=>",
        re.MULTILINE,
    )

    def analyze(self, file_path: Path) -> FileInfo:
        """解析单个 TSX 文件.

        Args:
            file_path: TSX 文件路径.

        Returns:
            FileInfo: 文件结构信息.
        """
        source = file_path.read_text(encoding="utf-8")
        line_count = len(source.splitlines())
        info = FileInfo(path=file_path, line_count=line_count)

        self._extract_props(source, info)
        self._extract_classes(source, info)
        self._extract_functions(source, info)

        return info

    def _extract_props(self, source: str, info: FileInfo) -> None:
        """提取 Props 接口/类型定义.

        Args:
            source: 文件源码.
            info: 待填充的文件信息.
        """
        for match in self._PROPS_PATTERN.finditer(source):
            name = match.group(1)
            body = match.group(2).strip()
            fields = [
                line.strip().rstrip(";").rstrip(",")
                for line in body.splitlines()
                if line.strip() and not line.strip().startswith("//")
            ]
            info.props.append(PropsInfo(name=name, fields=fields))

    def _extract_classes(self, source: str, info: FileInfo) -> None:
        """提取类组件信息.

        Args:
            source: 文件源码.
            info: 待填充的文件信息.
        """
        for match in self._CLASS_PATTERN.finditer(source):
            class_name = match.group(1)
            props_type = match.group(2).strip()
            info.classes.append(
                ClassInfo(
                    name=class_name,
                    bases=[f"Component<{props_type}>"],
                )
            )

    def _extract_functions(self, source: str, info: FileInfo) -> None:
        """提取函数声明.

        Args:
            source: 文件源码.
            info: 待填充的文件信息.
        """
        seen_names: set[str] = set()

        # 标准 function 声明
        for match in self._EXPORT_FUNC_PATTERN.finditer(source):
            name = match.group(1)
            if name in seen_names:
                continue
            seen_names.add(name)
            params = match.group(2).strip()
            return_type = match.group(3) or ""
            is_async = "async" in source[max(0, match.start() - 10):match.start()]
            info.functions.append(
                FunctionInfo(name=name, params=params, return_type=return_type, is_async=is_async)
            )

        # 箭头函数
        for match in self._ARROW_FUNC_PATTERN.finditer(source):
            name = match.group(1)
            if name in seen_names:
                continue
            seen_names.add(name)
            params = match.group(3).strip()
            return_type = match.group(4) or match.group(2) or ""
            info.functions.append(
                FunctionInfo(name=name, params=params, return_type=return_type.strip())
            )


# ---------------------------------------------------------------------------
# Java 解析器（基于正则）
# ---------------------------------------------------------------------------


class JavaAnalyzer:
    """使用正则表达式解析 Java 文件结构."""

    # 匹配类/接口/枚举声明
    _CLASS_PATTERN = re.compile(
        r"(?:public\s+|private\s+|protected\s+)?(?:abstract\s+|final\s+)?"
        r"(class|interface|enum)\s+(\w+)"
        r"(?:\s+extends\s+(\w+))?"
        r"(?:\s+implements\s+([\w,\s]+))?",
        re.MULTILINE,
    )

    # 匹配方法声明
    _METHOD_PATTERN = re.compile(
        r"(?:@\w+(?:\([^)]*\))?\s+)*"
        r"(?:public\s+|private\s+|protected\s+)?"
        r"(?:static\s+)?(?:final\s+)?(?:synchronized\s+)?"
        r"(?:abstract\s+)?(?:native\s+)?"
        r"(<[\w,\s<>?]+>\s+)?"
        r"([\w<>\[\]?,\s]+)\s+"
        r"(\w+)\s*\(([^)]*)\)",
        re.MULTILINE,
    )

    # 匹配注解
    _ANNOTATION_PATTERN = re.compile(r"@(\w+)(?:\([^)]*\))?")

    def analyze(self, file_path: Path) -> FileInfo:
        """解析单个 Java 文件.

        Args:
            file_path: Java 文件路径.

        Returns:
            FileInfo: 文件结构信息.
        """
        source = file_path.read_text(encoding="utf-8")
        line_count = len(source.splitlines())
        info = FileInfo(path=file_path, line_count=line_count)

        self._extract_classes(source, info)

        return info

    def _extract_classes(self, source: str, info: FileInfo) -> None:
        """提取类/接口/枚举信息.

        Args:
            source: 文件源码.
            info: 待填充的文件信息.
        """
        for match in self._CLASS_PATTERN.finditer(source):
            class_type = match.group(1)
            class_name = match.group(2)
            extends = match.group(3) or ""
            implements = match.group(4) or ""

            bases = []
            if extends:
                bases.append(extends)
            if implements:
                bases.extend([i.strip() for i in implements.split(",")])

            # 提取该类内的方法
            class_start = match.end()
            brace_count = 0
            class_end = class_start
            found_start = False

            for i, char in enumerate(source[class_start:], class_start):
                if char == "{":
                    if not found_start:
                        found_start = True
                    brace_count += 1
                elif char == "}":
                    brace_count -= 1
                    if found_start and brace_count == 0:
                        class_end = i
                        break

            class_body = source[class_start:class_end]
            methods = self._extract_methods(class_body)

            info.classes.append(
                ClassInfo(
                    name=f"{class_type} {class_name}",
                    bases=bases,
                    methods=methods,
                )
            )

    def _extract_methods(self, class_body: str) -> list[FunctionInfo]:
        """提取方法签名.

        Args:
            class_body: 类体源码.

        Returns:
            list[FunctionInfo]: 方法列表.
        """
        methods = []
        seen_names: set[str] = set()

        for match in self._METHOD_PATTERN.finditer(class_body):
            return_type = match.group(2).strip()
            method_name = match.group(3)
            params = match.group(4).strip()

            # 跳过构造函数和重复方法
            if method_name in seen_names:
                continue
            seen_names.add(method_name)

            # 检查是否有注解
            decorators = []
            prefix = class_body[max(0, match.start() - 200):match.start()]
            for ann_match in self._ANNOTATION_PATTERN.finditer(prefix):
                decorators.append(ann_match.group(1))

            methods.append(
                FunctionInfo(
                    name=method_name,
                    params=params,
                    return_type=return_type,
                    decorators=decorators[-3:] if decorators else [],
                )
            )

        return methods


# ---------------------------------------------------------------------------
# Vue SFC 解析器
# ---------------------------------------------------------------------------


class VueAnalyzer:
    """解析 Vue 单文件组件结构."""

    # 匹配 <script> 标签内容
    _SCRIPT_PATTERN = re.compile(
        r"<script(?:\s+[^>]*)?>(.+?)</script>",
        re.DOTALL | re.IGNORECASE,
    )

    # 匹配 defineComponent / export default
    _COMPONENT_PATTERN = re.compile(
        r"(?:export\s+default\s+)?defineComponent\s*\(\s*\{|"
        r"export\s+default\s*\{",
        re.MULTILINE,
    )

    # 匹配 defineProps
    _PROPS_PATTERN = re.compile(
        r"defineProps\s*<([^>]+)>\s*\(\s*\)|"
        r"defineProps\s*\(\s*\{([^}]+)\}\s*\)|"
        r"props\s*:\s*\{([^}]+)\}",
        re.MULTILINE | re.DOTALL,
    )

    # 匹配 setup 函数或 <script setup>
    _SETUP_PATTERN = re.compile(
        r"<script\s+setup|setup\s*\(\s*\)|setup\s*\(\s*props",
        re.IGNORECASE,
    )

    # 匹配函数定义（Composition API）
    _FUNC_PATTERN = re.compile(
        r"(?:const|function)\s+(\w+)\s*=?\s*(?:async\s+)?\(([^)]*)\)"
        r"(?:\s*:\s*([^\s{=>]+))?",
        re.MULTILINE,
    )

    def analyze(self, file_path: Path) -> FileInfo:
        """解析单个 Vue 文件.

        Args:
            file_path: Vue 文件路径.

        Returns:
            FileInfo: 文件结构信息.
        """
        source = file_path.read_text(encoding="utf-8")
        line_count = len(source.splitlines())
        info = FileInfo(path=file_path, line_count=line_count)

        # 提取 script 内容
        script_match = self._SCRIPT_PATTERN.search(source)
        if script_match:
            script_content = script_match.group(1)
            self._extract_props(script_content, info)
            self._extract_functions(script_content, info)

        # 检查是否使用 Composition API
        is_setup = bool(self._SETUP_PATTERN.search(source))

        # 将组件本身作为一个类记录
        component_name = file_path.stem
        info.classes.append(
            ClassInfo(
                name=component_name,
                bases=["Vue Component (setup)" if is_setup else "Vue Component"],
            )
        )

        return info

    def _extract_props(self, source: str, info: FileInfo) -> None:
        """提取 Props 定义.

        Args:
            source: script 源码.
            info: 待填充的文件信息.
        """
        for match in self._PROPS_PATTERN.finditer(source):
            props_content = match.group(1) or match.group(2) or match.group(3) or ""
            if props_content.strip():
                fields = [
                    line.strip().rstrip(",").rstrip(";")
                    for line in props_content.splitlines()
                    if line.strip() and not line.strip().startswith("//")
                ]
                if fields:
                    info.props.append(PropsInfo(name="Props", fields=fields))

    def _extract_functions(self, source: str, info: FileInfo) -> None:
        """提取 Composition API 函数.

        Args:
            source: script 源码.
            info: 待填充的文件信息.
        """
        seen_names: set[str] = set()
        # 排除 Vue 内置函数
        vue_builtins = {"ref", "reactive", "computed", "watch", "onMounted", "defineProps", "defineEmits"}

        for match in self._FUNC_PATTERN.finditer(source):
            name = match.group(1)
            if name in seen_names or name in vue_builtins:
                continue
            seen_names.add(name)

            params = match.group(2).strip()
            return_type = match.group(3) or ""

            info.functions.append(
                FunctionInfo(name=name, params=params, return_type=return_type)
            )


# ---------------------------------------------------------------------------
# Markdown 生成器
# ---------------------------------------------------------------------------


class MarkdownGenerator:
    """将分析结果转换为 PROJECT_MAP.md 内容."""

    def generate(self, files: list[FileInfo], root: Path) -> str:
        """生成完整的 Markdown 文档.

        Args:
            files: 所有文件分析结果.
            root: 项目根目录.

        Returns:
            str: Markdown 格式的项目映射文档.
        """
        total_lines = sum(f.line_count for f in files)
        sections = [
            "# PROJECT MAP\n",
            f"> {len(files)} files, {total_lines:,} lines\n",
            self._generate_exports(files, root),
        ]
        return "\n".join(sections)

    def _generate_exports(self, files: list[FileInfo], root: Path) -> str:
        """生成紧凑的导出符号列表.

        Args:
            files: 所有文件信息.
            root: 项目根目录.

        Returns:
            str: 导出符号列表的 Markdown 片段.
        """
        lines = ["## Exports\n"]

        for f in sorted(files, key=lambda x: str(x.path)):
            rel = f.path.relative_to(root) if f.path.is_relative_to(root) else f.path

            # 收集所有导出符号
            symbols: list[str] = []

            # 添加类名
            for cls in f.classes:
                symbols.append(cls.name)

            # 添加函数名
            for func in f.functions:
                symbols.append(func.name)

            # 添加 Props 类型名
            props_names = [p.name for p in f.props]

            # 跳过无导出的文件
            if not symbols and not props_names:
                continue

            # 构建紧凑的一行输出
            line_parts = [f"`{rel}` ({f.line_count}L)"]

            if symbols:
                # 限制显示数量，避免单行过长
                if len(symbols) > 8:
                    display_symbols = ", ".join(symbols[:8]) + f" +{len(symbols) - 8}"
                else:
                    display_symbols = ", ".join(symbols)
                line_parts.append(display_symbols)

            if props_names:
                line_parts.append(f"[{', '.join(props_names)}]")

            lines.append(" → ".join(line_parts))

        lines.append("")
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# 主逻辑
# ---------------------------------------------------------------------------


def collect_files(directories: list[Path], extensions: set[str]) -> list[Path]:
    """递归收集指定目录下的目标文件.

    Args:
        directories: 需要扫描的目录列表.
        extensions: 目标文件后缀集合（如 {'.py', '.tsx'}）.

    Returns:
        list[Path]: 匹配的文件路径列表.
    """
    files: list[Path] = []
    for directory in directories:
        if not directory.exists():
            print(f"[WARN] Directory not found, skipping: {directory}")
            continue
        for file_path in sorted(directory.rglob("*")):
            if file_path.suffix in extensions and file_path.is_file():
                # 跳过隐藏目录和虚拟环境
                parts = file_path.parts
                if any(p.startswith(".") or p in ("node_modules", "__pycache__", ".venv") for p in parts):
                    continue
                files.append(file_path)
    return files


def analyze_files(files: list[Path]) -> list[FileInfo]:
    """分析所有收集到的文件.

    Args:
        files: 待分析的文件路径列表.

    Returns:
        list[FileInfo]: 分析结果列表.
    """
    py_analyzer = PythonAnalyzer()
    tsx_analyzer = TsxAnalyzer()
    java_analyzer = JavaAnalyzer()
    vue_analyzer = VueAnalyzer()
    results: list[FileInfo] = []

    for file_path in files:
        suffix = file_path.suffix.lower()
        if suffix == ".py":
            results.append(py_analyzer.analyze(file_path))
        elif suffix in (".tsx", ".ts", ".jsx", ".js"):
            results.append(tsx_analyzer.analyze(file_path))
        elif suffix == ".java":
            results.append(java_analyzer.analyze(file_path))
        elif suffix == ".vue":
            results.append(vue_analyzer.analyze(file_path))

    return results


def parse_args() -> argparse.Namespace:
    """解析命令行参数.

    Returns:
        argparse.Namespace: 解析后的参数对象.
    """
    parser = argparse.ArgumentParser(
        description="Scan project directories and generate PROJECT_MAP.md"
    )
    parser.add_argument(
        "dirs",
        nargs="*",
        default=["src", "backend"],
        help="Directories to scan (default: src backend)",
    )
    parser.add_argument(
        "-o", "--output",
        default="PROJECT_MAP.md",
        help="Output file path (default: PROJECT_MAP.md)",
    )
    parser.add_argument(
        "-e", "--extensions",
        nargs="*",
        default=[".py", ".tsx", ".ts", ".jsx", ".js", ".java", ".vue"],
        help="File extensions to include (default: .py .tsx .ts .jsx .js .java .vue)",
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Project root directory (default: current directory)",
    )
    return parser.parse_args()


def main() -> None:
    """脚本入口函数."""
    args = parse_args()
    root = Path(args.root).resolve()
    directories = [root / d for d in args.dirs]
    extensions = set(args.extensions)
    output_path = root / args.output

    print(f"[INFO] Project root: {root}")
    print(f"[INFO] Scanning directories: {[str(d) for d in directories]}")
    print(f"[INFO] Target extensions: {extensions}")

    files = collect_files(directories, extensions)
    if not files:
        print("[WARN] No matching files found. Check directory paths.")
        sys.exit(0)

    print(f"[INFO] Found {len(files)} files. Analyzing...")

    results = analyze_files(files)
    generator = MarkdownGenerator()
    content = generator.generate(results, root)

    output_path.write_text(content, encoding="utf-8")
    print(f"[OK] Generated: {output_path}")
    print(f"[INFO] Total files: {len(results)}, Total lines: {sum(f.line_count for f in results):,}")


if __name__ == "__main__":
    main()
