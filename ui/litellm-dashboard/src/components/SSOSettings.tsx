import React, { useState, useEffect } from "react";
import { Card, Title, Text, Divider, Button, TextInput } from "@tremor/react";
import { Typography, Spin, message, Switch, Select, Form } from "antd";
import { getInternalUserSettings, updateInternalUserSettings } from "./networking";

interface SSOSettingsProps {
  accessToken: string | null;
}

const SSOSettings: React.FC<SSOSettingsProps> = ({ accessToken }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<any>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedValues, setEditedValues] = useState<any>({});
  const [saving, setSaving] = useState<boolean>(false);
  const { Paragraph } = Typography;
  const { Option } = Select;

  useEffect(() => {
    const fetchSSOSettings = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const data = await getInternalUserSettings(accessToken);
        setSettings(data);
        setEditedValues(data.values || {});
      } catch (error) {
        console.error("Error fetching SSO settings:", error);
        message.error("Failed to fetch SSO settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSSOSettings();
  }, [accessToken]);

  const handleSaveSettings = async () => {
    if (!accessToken) return;
    
    setSaving(true);
    try {
      const updatedSettings = await updateInternalUserSettings(accessToken, editedValues);
      setSettings({...settings, values: updatedSettings.settings});
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating SSO settings:", error);
      message.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTextInputChange = (key: string, value: any) => {
    setEditedValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderEditableField = (key: string, property: any, value: any) => {
    const type = property.type;
    
    if (type === "boolean") {
      return (
        <div className="mt-2">
          <Switch 
            checked={!!editedValues[key]} 
            onChange={(checked) => handleTextInputChange(key, checked)}
          />
        </div>
      );
    } else if (type === "array" && property.items?.enum) {
      return (
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          value={editedValues[key] || []}
          onChange={(value) => handleTextInputChange(key, value)}
          className="mt-2"
        >
          {property.items.enum.map((option: string) => (
            <Option key={option} value={option}>{option}</Option>
          ))}
        </Select>
      );
    } else if (type === "string" && property.enum) {
      return (
        <Select
          style={{ width: '100%' }}
          value={editedValues[key] || ""}
          onChange={(value) => handleTextInputChange(key, value)}
          className="mt-2"
        >
          {property.enum.map((option: string) => (
            <Option key={option} value={option}>{option}</Option>
          ))}
        </Select>
      );
    } else {
      return (
        <TextInput 
          value={editedValues[key] !== undefined ? String(editedValues[key]) : ""} 
          onChange={(e) => handleTextInputChange(key, e.target.value)}
          placeholder={property.description || ""}
          className="mt-2"
        />
      );
    }
  };

  const renderValue = (value: any): JSX.Element => {
    if (value === null || value === undefined) return <span className="text-gray-400">Not set</span>;
    
    if (typeof value === "boolean") {
      return <span>{value ? "Enabled" : "Disabled"}</span>;
    }
    
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        if (value.length === 0) return <span className="text-gray-400">None</span>;
        
        return (
          <div className="flex flex-wrap gap-2 mt-1">
            {value.map((item, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 rounded text-xs">
                {typeof item === "object" ? JSON.stringify(item) : String(item)}
              </span>
            ))}
          </div>
        );
      }
      
      return (
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto mt-1">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    
    return <span>{String(value)}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <Title>SSO Settings</Title>
        <Text>No settings available or you don't have permission to view them.</Text>
      </Card>
    );
  }

  // Dynamically render settings based on the schema
  const renderSettings = () => {
    const { values, schema } = settings;
    
    if (!schema || !schema.properties) {
      return <Text>No schema information available</Text>;
    }

    return Object.entries(schema.properties).map(([key, property]: [string, any]) => {
      const value = values[key];
      const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      return (
        <div key={key} className="mb-6 pb-6 border-b border-gray-200 last:border-0">
          <Text className="font-medium text-lg">{displayName}</Text>
          <Paragraph className="text-sm text-gray-500 mt-1">
            {property.description || "No description available"}
          </Paragraph>
          
          {isEditing ? (
            <div className="mt-2">
              {renderEditableField(key, property, value)}
            </div>
          ) : (
            <div className="mt-1 p-2 bg-gray-50 rounded">
              {renderValue(value)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <Title>SSO Settings</Title>
        {!loading && settings && (
          isEditing ? (
            <div className="flex gap-2">
              <Button 
                color="gray" 
                onClick={() => {
                  setIsEditing(false);
                  setEditedValues(settings.values || {});
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                color="blue" 
                onClick={handleSaveSettings}
                loading={saving}
              >
                Save Changes
              </Button>
            </div>
          ) : (
            <Button 
              variant="light"
              onClick={() => setIsEditing(true)}
            >
              Edit Settings
            </Button>
          )
        )}
      </div>
      
      {settings?.schema?.description && (
        <Paragraph className="mb-4">{settings.schema.description}</Paragraph>
      )}
      <Divider />
      
      <div className="mt-4 space-y-4">
        {renderSettings()}
      </div>
    </Card>
  );
};

export default SSOSettings; 