import React from 'react';

interface Props {
  depth: number;
  children: React.ReactNode;
}

export default function Header({ depth, children }: Props) {
  switch (depth) {
    case 1:
      return <h1 className="text-2xl font-bold">{children}</h1>;
    case 2:
      return <h2 className="text-xl font-bold">{children}</h2>;
    case 3:
      return <h3 className="text-lg font-bold">{children}</h3>;
    case 4:
      return <h4 className="text-base font-bold">{children}</h4>;
    case 5:
      return <h5 className="text-sm font-bold">{children}</h5>;
    case 6:
      return <h6 className="text-xs font-bold">{children}</h6>;
    default:
      return <>{children}</>;
  }
}