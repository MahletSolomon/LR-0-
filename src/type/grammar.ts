export type Symbol = string;

export type Production = {
  id: number;
  left: Symbol;
  right: Symbol[]; // [] means epsilon
  raw?: string;
};

export type Grammar = {
  startSymbol: Symbol;
  nonTerminals: Set<Symbol>;
  terminals: Set<Symbol>;
  productions: Production[];
};

export type GrammarParseResult = {
  grammar?: Grammar;
  errors: string[];
  warnings: string[];
};
