import React, { useState, useEffect } from "react";

interface Rule {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

const RulePanel: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");

  // Load rules from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("zen-rules");
    if (stored) {
      try {
        setRules(JSON.parse(stored));
      } catch (error) {
        console.error("Error loading rules:", error);
      }
    }
  }, []);

  // Save rules to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("zen-rules", JSON.stringify(rules));
  }, [rules]);

  const createRule = () => {
    if (!formName.trim() || !formContent.trim()) {
      alert("Please fill in both name and content");
      return;
    }

    const newRule: Rule = {
      id: `rule-${Date.now()}`,
      name: formName.trim(),
      content: formContent.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setRules((prev) => [...prev, newRule]);
    setFormName("");
    setFormContent("");
    setIsCreating(false);
  };

  const updateRule = () => {
    if (!editingRule || !formName.trim() || !formContent.trim()) {
      alert("Please fill in both name and content");
      return;
    }

    setRules((prev) =>
      prev.map((rule) =>
        rule.id === editingRule.id
          ? {
              ...rule,
              name: formName.trim(),
              content: formContent.trim(),
              updatedAt: Date.now(),
            }
          : rule
      )
    );

    setEditingRule(null);
    setFormName("");
    setFormContent("");
  };

  const deleteRule = (id: string) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      setRules((prev) => prev.filter((rule) => rule.id !== id));
    }
  };

  const startEdit = (rule: Rule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormContent(rule.content);
    setIsCreating(false);
  };

  const cancelEdit = () => {
    setEditingRule(null);
    setIsCreating(false);
    setFormName("");
    setFormContent("");
  };

  return (
    <div
      style={{
        padding: "var(--spacing-lg)",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--spacing-lg)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "var(--font-size-lg)",
            color: "var(--primary-text)",
          }}
        >
          Rules Management
        </h2>
        {!isCreating && !editingRule && (
          <button
            onClick={() => setIsCreating(true)}
            style={{
              padding: "var(--spacing-sm) var(--spacing-md)",
              backgroundColor: "var(--button-bg)",
              color: "var(--button-text)",
              border: "none",
              borderRadius: "var(--border-radius)",
              cursor: "pointer",
              fontSize: "var(--font-size-sm)",
            }}
          >
            + Create New Rule
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingRule) && (
        <div
          style={{
            marginBottom: "var(--spacing-lg)",
            padding: "var(--spacing-md)",
            backgroundColor: "var(--secondary-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--border-radius)",
          }}
        >
          <h3
            style={{
              margin: "0 0 var(--spacing-md) 0",
              fontSize: "var(--font-size-md)",
              color: "var(--primary-text)",
            }}
          >
            {editingRule ? "Edit Rule" : "Create New Rule"}
          </h3>

          <div style={{ marginBottom: "var(--spacing-md)" }}>
            <label
              style={{
                display: "block",
                marginBottom: "var(--spacing-xs)",
                fontSize: "var(--font-size-sm)",
                color: "var(--primary-text)",
              }}
            >
              Rule Name:
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Code Style Guidelines"
              style={{
                width: "100%",
                padding: "var(--spacing-sm)",
                backgroundColor: "var(--primary-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--border-radius)",
                color: "var(--primary-text)",
                fontSize: "var(--font-size-sm)",
              }}
            />
          </div>

          <div style={{ marginBottom: "var(--spacing-md)" }}>
            <label
              style={{
                display: "block",
                marginBottom: "var(--spacing-xs)",
                fontSize: "var(--font-size-sm)",
                color: "var(--primary-text)",
              }}
            >
              Rule Content:
            </label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Enter the rule content..."
              style={{
                width: "100%",
                minHeight: "150px",
                padding: "var(--spacing-sm)",
                backgroundColor: "var(--primary-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--border-radius)",
                color: "var(--primary-text)",
                fontSize: "var(--font-size-sm)",
                fontFamily: "monospace",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
            <button
              onClick={editingRule ? updateRule : createRule}
              style={{
                padding: "var(--spacing-sm) var(--spacing-md)",
                backgroundColor: "var(--button-bg)",
                color: "var(--button-text)",
                border: "none",
                borderRadius: "var(--border-radius)",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
              }}
            >
              {editingRule ? "Update Rule" : "Create Rule"}
            </button>
            <button
              onClick={cancelEdit}
              style={{
                padding: "var(--spacing-sm) var(--spacing-md)",
                backgroundColor: "var(--secondary-bg)",
                color: "var(--primary-text)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--border-radius)",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div>
        {rules.length === 0 ? (
          <div
            style={{
              padding: "var(--spacing-xl)",
              textAlign: "center",
              color: "var(--secondary-text)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            No rules yet. Create your first rule to get started.
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              style={{
                marginBottom: "var(--spacing-md)",
                padding: "var(--spacing-md)",
                backgroundColor: "var(--secondary-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--border-radius)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "var(--spacing-sm)",
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-md)",
                    color: "var(--primary-text)",
                  }}
                >
                  {rule.name}
                </h4>
                <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
                  <button
                    onClick={() => startEdit(rule)}
                    style={{
                      padding: "var(--spacing-xs) var(--spacing-sm)",
                      backgroundColor: "var(--button-bg)",
                      color: "var(--button-text)",
                      border: "none",
                      borderRadius: "var(--border-radius)",
                      cursor: "pointer",
                      fontSize: "var(--font-size-xs)",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    style={{
                      padding: "var(--spacing-xs) var(--spacing-sm)",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "var(--border-radius)",
                      cursor: "pointer",
                      fontSize: "var(--font-size-xs)",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: "var(--spacing-sm)",
                  backgroundColor: "var(--primary-bg)",
                  borderRadius: "var(--border-radius)",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--primary-text)",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {rule.content}
              </div>

              <div
                style={{
                  marginTop: "var(--spacing-sm)",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--secondary-text)",
                }}
              >
                Last updated: {new Date(rule.updatedAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RulePanel;
