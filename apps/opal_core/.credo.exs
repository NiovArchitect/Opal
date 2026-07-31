# Credo configuration for Opal Core (Slice 1)
%{
  configs: [
    %{
      name: "default",
      files: %{
        included: ["lib/", "test/"],
        excluded: [~r"/_build/", ~r"/deps/"]
      },
      strict: true,
      checks: [
        {Credo.Check.Refactor.CyclomaticComplexity, max_complexity: 20},
        {Credo.Check.Refactor.Nesting, max_nesting: 4},
        {Credo.Check.Readability.ModuleDoc, false},
        {Credo.Check.Readability.AliasOrder, false},
        {Credo.Check.Design.AliasUsage, false},
        {Credo.Check.Refactor.WithClauses, false},
        {Credo.Check.Refactor.RedundantWithClauseResult, false},
        {Credo.Check.Refactor.CondStatements, false},
        {Credo.Check.Refactor.MapJoin, false}
      ]
    }
  ]
}
