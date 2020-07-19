export declare function makeProvider<T>(
  useHook: () => T
): { Provider: ({ children }) => any; useProvider: () => T };
