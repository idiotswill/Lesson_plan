"""Bounded introductory Python, executed only in a disposable local child process.
Real CPython semantics for the supported subset; not a general-purpose code sandbox.
No imports, attributes, file/network APIs, classes, eval or arbitrary function calls.
"""
from __future__ import annotations
import ast
import contextlib
import io
import json
import math
import operator
import sys

OPS = {'Add':operator.add,'Sub':operator.sub,'Mult':operator.mul,
       'Div':operator.truediv,'FloorDiv':operator.floordiv,'Mod':operator.mod}
ALLOWED = (ast.Module,ast.Assign,ast.AugAssign,ast.Name,ast.Load,ast.Store,ast.Constant,
           ast.BinOp,ast.Add,ast.Sub,ast.Mult,ast.Div,ast.FloorDiv,ast.Mod,
           ast.UnaryOp,ast.UAdd,ast.USub,ast.Not,ast.BoolOp,ast.And,ast.Or,
           ast.Compare,ast.Eq,ast.NotEq,ast.Lt,ast.LtE,ast.Gt,ast.GtE,
           ast.If,ast.IfExp,ast.While,ast.For,ast.Break,ast.Continue,ast.Pass,
           ast.Expr,ast.Call,ast.List,ast.Tuple,ast.Subscript)
FUNCTIONS = {'range','print','len','sum','min','max','abs','int','float','bool','str','round'}

def bounded(value):
    if type(value) is bool or value is None: return value
    if type(value) is int:
        if abs(value)>10**12: raise ValueError('Numbers in this introductory workbench must stay within ±1 trillion.')
    elif type(value) is float:
        if not math.isfinite(value) or abs(value)>10**12: raise ValueError('This calculation exceeded the workbench number limit.')
    elif type(value) is str:
        if len(value)>2000: raise ValueError('Text limit reached (2,000 characters).')
    elif type(value) in (list,tuple,range):
        if len(value)>1000: raise ValueError('Collection limit reached (1,000 items).')
        for item in value: bounded(item)
    else: raise ValueError('Unsupported value in this introductory workbench.')
    return value

def arithmetic(name,a,b):
    bounded(a);bounded(b)
    if type(a) in (str,list,tuple) or type(b) in (str,list,tuple):
        if name=='Add' and type(a) is type(b) and len(a)+len(b)<=1000: return bounded(a+b)
        raise ValueError('Only bounded sequence concatenation is supported here; sequence repetition is not enabled.')
    return bounded(OPS[name](a,b))

class GuardArithmetic(ast.NodeTransformer):
    def visit_BinOp(self,node):
        self.generic_visit(node)
        return ast.copy_location(ast.Call(func=ast.Name(id='_arithmetic',ctx=ast.Load()),
            args=[ast.Constant(type(node.op).__name__),node.left,node.right],keywords=[]),node)
    def visit_AugAssign(self,node):
        # Target is restricted to a plain name by validation.
        value=ast.Call(func=ast.Name(id='_arithmetic',ctx=ast.Load()),args=[
            ast.Constant(type(node.op).__name__),ast.Name(id=node.target.id,ctx=ast.Load()),self.visit(node.value)],keywords=[])
        return ast.copy_location(ast.Assign(targets=[node.target],value=value),node)

class Output(io.StringIO):
    def write(self,text):
        room=max(0,4000-len(self.getvalue()))
        super().write(text[:room]); return len(text)

def compile_lesson(code,requires_loop=False):
    if not isinstance(code,str) or len(code)>18000: raise ValueError('Code limit is 18,000 characters.')
    tree=ast.parse(code,filename='<your-program>')
    nodes=list(ast.walk(tree))
    if len(nodes)>2500: raise ValueError('This program is too large for the introductory workbench.')
    for n in nodes:
        if not isinstance(n,ALLOWED): raise ValueError(type(n).__name__+' is not enabled in this introductory Python workbench. Export your program for unrestricted Python.')
        if isinstance(n,ast.Name) and (n.id.startswith('_') or len(n.id)>64): raise ValueError('Use ordinary variable names without an initial underscore.')
        if isinstance(n,ast.Constant): bounded(n.value)
        if isinstance(n,ast.Call) and (not isinstance(n.func,ast.Name) or n.func.id not in FUNCTIONS or n.keywords):
            raise ValueError('Only the documented beginner functions are available here, without keyword arguments.')
        if isinstance(n,(ast.Assign,ast.AugAssign,ast.For)):
            targets=n.targets if isinstance(n,ast.Assign) else [n.target]
            if any(not isinstance(t,ast.Name) or t.id in FUNCTIONS for t in targets):
                raise ValueError('Assign to a variable name, not an indexed value or a built-in function.')
    if requires_loop and not any(isinstance(n,(ast.While,ast.For)) for n in nodes):
        raise ValueError('This activity practises loops. Use a while or for loop.')
    return compile(ast.fix_missing_locations(GuardArithmetic().visit(tree)),'<your-program>','exec')

def run(payload):
    if not isinstance(payload,dict): raise ValueError('Expected a program request.')
    output_name=payload.get('output')
    if not isinstance(output_name,str) or not output_name.isidentifier() or output_name.startswith('_'): raise ValueError('Invalid output variable.')
    cases=payload.get('cases')
    if not isinstance(cases,list) or not 1<=len(cases)<=20: raise ValueError('Supply 1–20 input cases.')
    compiled=compile_lesson(payload.get('code'),payload.get('requiresLoop',False))
    def safe_range(*args): return bounded(range(*args))
    safe={'range':safe_range,'len':len,'sum':lambda seq:bounded(sum(bounded(seq))),
          'min':min,'max':max,'abs':abs,'int':int,'float':float,'bool':bool,'str':str,'round':round,'print':print}
    results=[]
    for case in cases:
        if not isinstance(case,dict) or len(case)>30: raise ValueError('Invalid input case.')
        if any(not k.isidentifier() or k.startswith('_') or k in FUNCTIONS for k in case): raise ValueError('Invalid input name.')
        ns={'__builtins__':safe,'_arithmetic':arithmetic,**{k:bounded(v) for k,v in case.items()}}
        trace=[]; count=0; stream=Output()
        def watch(frame,event,arg):
            nonlocal count
            if frame.f_code.co_filename=='<your-program>' and event in ('line','return'):
                count+=1
                if count>12000: raise RuntimeError('Step limit reached. Check that your loop changes its counter and can stop.')
                vals={}
                for k,v in frame.f_locals.items():
                    if not k.startswith('_'):
                        bounded(v)
                        if type(v) in (int,float,bool,str): vals[k]=v if not isinstance(v,str) else v[:100]
                if len(trace)<160: trace.append({'line':frame.f_lineno,'event':event,'values':vals})
            return watch
        try:
            sys.settrace(watch)
            with contextlib.redirect_stdout(stream): exec(compiled,ns,ns)
            sys.settrace(None)
            value=bounded(ns.get(output_name))
            if type(value) not in (bool,int,float): value=None
            results.append({'value':value,'error':'','trace':trace,'stdout':stream.getvalue()})
        except Exception as exc:
            sys.settrace(None)
            results.append({'value':None,'error':type(exc).__name__+': '+str(exc)[:700],'trace':trace,'stdout':stream.getvalue()})
    return results

if __name__=='__main__':
    try:
        # Unix additionally constrains memory/CPU. Windows still has AST, step,
        # size and parent-enforced wall-time limits; this is not OS isolation.
        try:
            import resource
            resource.setrlimit(resource.RLIMIT_AS,(192*1024*1024,192*1024*1024))
            resource.setrlimit(resource.RLIMIT_CPU,(3,3))
        except (ImportError,ValueError,OSError): pass
        request=json.loads(sys.stdin.buffer.read(60001))
        answer={'results':run(request)}
    except Exception as exc: answer={'error':type(exc).__name__+': '+str(exc)[:1000]}
    sys.stdout.write(json.dumps(answer,allow_nan=False))
