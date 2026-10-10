import type { MDXComponents } from "mdx/types";

import EmptyImage from "../EmptyImage";
import { components } from "./components";

// Register React components here to make them available in every MDX document.
export const mdxComponents: MDXComponents = {
  ...components,

  EmptyImage,

  h1: (props) => (
    <h1 className="text-teal-500">
      # {props.children}
    </h1>
  ),
  h2: (props) => (
    <h2 className="text-teal-500 mt-8">
      ## {props.children}
    </h2>
  ),
  h3: (props) => (
    <h3 className="text-teal-500 mt-4">
      ### {props.children}
    </h3>
  ),
  h4: (props) => (
    <h4 className="text-teal-500 mt-4">
      #### {props.children}
    </h4>
  ),
  h5: (props) => (
    <h5 className="text-teal-500 mt-4">
      ##### {props.children}
    </h5>
  ),
  h6: (props) => (
    <h6 className="text-teal-500 mt-4">
      ###### {props.children}
    </h6>
  ),
  p: (props) => <p {...props} className="my-4 leading-7 text-neutral-300" />,
  a: (props) => <a {...props} className="underline decoration-neutral-500 duration-200 ease-out underline-offset-4 hover:decoration-white" />,
  ul: (props) => <ul {...props} className="my-4 list-disc space-y-2 pl-6 text-neutral-300" />,
  ol: (props) => <ol {...props} className="my-4 list-decimal space-y-2 pl-6 text-neutral-300" />,
  blockquote: (props) => <blockquote {...props} className="my-6 border-l-2 border-neutral-600 pl-4 italic text-neutral-400" />,
  pre: ({ className, ...props }) => <pre {...props} style={{}} className={`my-6 overflow-x-auto rounded-xl bg-neutral-800 p-4 text-sm leading-6 ${className ?? ""}`} />,
  code: ({ className, ...props }) => <code {...props} className={`rounded-md bg-neutral-700 px-1.5 py-0.5 text-sm [pre_&]:bg-transparent [pre_&]:p-0 ${className ?? ""}`} />,
  hr: (props) => <hr {...props} className="my-8 border-neutral-800" />,
};
