import React, { useState, useEffect, useRef, useContext } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Stack,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  useMediaQuery,
  SwipeableDrawer,
  AppBar,
  Toolbar,
  Fab,
  Zoom,
  FormControl,
  InputLabel,
  Select,
  Button,
  Badge,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import MenuIcon from "@mui/icons-material/Menu";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AdminContext } from "../../App";
import { ThemeProvider, createTheme, useTheme } from "@mui/material/styles";
import {
  getConversation,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsDelivered,
  markAsRead,
  getOnlineStatus,
  getAllUsers,
  addMember,
  getMembers,
} from "../../services/chat";
import io from "socket.io-client";

const theme = createTheme({
  palette: {
    primary: {
      main: "#6A1B9A", // Deep Purple
    },
    secondary: {
      main: "#00BFA5", // Teal
    },
    background: {
      default: "#F3E5F5", // Light Purple
      paper: "#FFFFFF",
    },
  },
});
const generateRoomId = (userId1, userId2) => {
  const id1 = parseInt(userId1, 10);
  const id2 = parseInt(userId2, 10);
  const roomId = (id1 + id2) % 1e11;
  return roomId.toString();
};

const WhatsAppStyleChatInterface = () => {
  const { IsUserLoggedIn } = useContext(AdminContext);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isOnline, setIsOnline] = useState({});
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const listRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));

  useEffect(() => {
    fetchAllUsers();
    fetchMembers();
    initializeSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedUser && IsUserLoggedIn) {
      joinRoom(selectedUser._id);
      fetchConversation();
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

   const initializeSocket = () => {
     const socketUrl = import.meta.env.VITE_SOCKET_URL;
     console.log(`Connecting to socket at ${socketUrl}`);
     socketRef.current = io(socketUrl, {
       auth: {
         token: IsUserLoggedIn?.token,
       },
     });

     socketRef.current.on("connect", () => {
       console.log("Socket connected");
       socketRef.current.emit("user_connected", IsUserLoggedIn?._id);
     });

     socketRef.current.on("newMessage", (message) => {
       if (message.recipientId._id === IsUserLoggedIn?._id) {
         message.deliveryStatus = "read";
         console.log(message, "new message");
       }

       setMessages((prevMessages) => [...prevMessages, message]);
     });

     socketRef.current.on("message_edited", (updatedMessage) => {
       setMessages((prevMessages) =>
         prevMessages.map((msg) =>
           msg._id === updatedMessage._id ? updatedMessage : msg
         )
       );
     });

     socketRef.current.on("message_deleted", (messageId) => {
       setMessages((prevMessages) =>
         prevMessages.filter((msg) => msg._id !== messageId)
       );
     });

     socketRef.current.on("message_delivered", (message) => {
       console.log("message delievred",message)
       setMessages((prevMessages) =>
         prevMessages.map((msg) =>
           msg._id === message._id
             ? { ...msg, deliveryStatus: "delivered" }
             : msg
         )
       );
     });

     socketRef.current.on("message_read", (message) => {
       setMessages((prevMessages) =>
         prevMessages.map((msg) =>
           msg._id === message._id ? { ...msg, deliveryStatus: "read" } : msg
         )
       );
     });

     socketRef.current.on("user_status_change", ({ userId, status }) => {
       setIsOnline((prev) => ({ ...prev, [userId]: status === "online" }));
     });

     socketRef.current.on("user_typing", ({ userId, isTyping }) => {
       setTypingUsers((prev) => ({ ...prev, [userId]: isTyping }));
     });
   };

  const joinRoom = (selectedUserId) => {
    const userId = IsUserLoggedIn?._id;
    if (userId && selectedUserId) {
      const roomId = generateRoomId(userId, selectedUserId);
      console.log(`Joining room: ${roomId}`);
      socketRef.current.emit("join_room", roomId, userId);
    }
  };

  const fetchConversation = async () => {
    try {
      const conversationData = await getConversation(selectedUser._id);
      console.log(conversationData);
      setMessages(conversationData);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      setSnackbar({
        open: true,
        message: "Failed to load conversation",
        severity: "error",
      });
    }
  };

  const fetchAllUsers = async () => {
    try {
      const users = await getAllUsers();
      setAllUsers(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      setSnackbar({
        open: true,
        message: "Failed to load users",
        severity: "error",
      });
    }
  };

  const fetchMembers = async () => {
    try {
      const fetchedMembers = await getMembers();
      console.log(fetchedMembers, "ppppppppppppp");
      setMembers(fetchedMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
      setSnackbar({
        open: true,
        message: "Failed to load members",
        severity: "error",
      });
    }
  };

  const handleScroll = () => {
    if (listRef.current) {
      const { scrollTop } = listRef.current;
      setShowScrollTop(scrollTop > 300);
    }
  };

  const scrollToTop = () => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAddMember = async () => {
    if (selectedUser) {
      try {
        await addMember(selectedUser._id);
        setSnackbar({
          open: true,
          message: "Member added successfully",
          severity: "success",
        });
        fetchMembers();
        setSelectedUser(null);
      } catch (error) {
        console.error("Error adding member:", error);
        setSnackbar({
          open: true,
          message: "Failed to add member",
          severity: "error",
        });
      }
    }
  };

  const handleInputChange = (event) => {
    setInputMessage(event.target.value);
    handleTyping(event.target.value);
  };

  const handleTyping = (text) => {
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      socketRef.current.emit("typing", {
        userId: IsUserLoggedIn?._id,
        recipientId: selectedUser?._id,
        isTyping: true,
      });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socketRef.current.emit("typing", {
          userId: IsUserLoggedIn?._id,
          recipientId: selectedUser?._id,
          isTyping: false,
        });
      }
    }, 1000);
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() && selectedUser) {
      try {
        const newMessage = await sendMessage(selectedUser._id, inputMessage);
        setInputMessage("");
        socketRef.current.emit(
          "send_message",
          newMessage,
          IsUserLoggedIn?._id,
          selectedUser?._id,
         
        );
        setIsTyping(false);
        socketRef.current.emit("typing", {
          sender: IsUserLoggedIn?._id,
          receiver: selectedUser?._id,


          isTyping: false,
        });
      } catch (error) {
        console.error("Error sending message:", error);
        setSnackbar({
          open: true,
          message: "Failed to send message",
          severity: "error",
        });
      }
    }
  };

 const handleEditMessage = async (id) => {
   const messageToEdit = messages.find((msg) => msg._id === id);
   if (messageToEdit) {
     setInputMessage(messageToEdit.content);
     setEditingMessageId(id);
   }
 };

  const handleDeleteMessage = async (id) => {
   console.log(id,"handledelete")
   try {
     await deleteMessage(id);
     setMessages(messages.filter((msg) => msg._id !== id));
     socketRef.current.emit("delete_message", id);
     setSnackbar({
       open: true,
       message: "Message deleted",
       severity: "success",
     });
   } catch (error) {
     console.error("Error deleting message:", error);
     setSnackbar({
       open: true,
       message: "Failed to delete message",
       severity: "error",
     });
   }
 };


  const handleMenuOpen = (event, id) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessageId(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessageId(null);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const formatTimestamp = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleDrawer = (open) => (event) => {
    if (
      event &&
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setDrawerOpen(open);
  };

 const MessageBubble = ({ message, handleEdit, handleDelete }) => (
   <Paper
     elevation={1}
     sx={{
       p: 1.5,
       borderRadius: 2,
       maxWidth: "70%",
       bgcolor: message.senderId === IsUserLoggedIn._id ? "#E1BEE7" : "#FFFFFF", // Light Purple for sent messages
       alignSelf:
         message.senderId === IsUserLoggedIn._id ? "flex-end" : "flex-start",
     }}
   >
     <Typography variant="body1">{message.content}</Typography>
     <Stack
       direction="row"
       spacing={1}
       alignItems="center"
       justifyContent="flex-end"
       sx={{ mt: 0.5 }}
     >
       <Typography variant="caption" sx={{ opacity: 0.7 }}>
         {formatTimestamp(message.timestamp)}
       </Typography>
       { (
         <>
           <IconButton size="small" onClick={() => handleEdit(message._id)}>
             <EditIcon fontSize="small" />
           </IconButton>
           <IconButton size="small" onClick={() => handleDelete(message._id)}>
             <DeleteIcon fontSize="small" />
           </IconButton>
           <DoneAllIcon
             sx={{
               fontSize: 16,
               color: message.deliveryStatus === "read" ? "#00BFA5" : "inherit", // Teal for read messages
             }}
           />
         </>
       )}
     </Stack>
   </Paper>
 );
const chatContent = (
  <>
    <List
      ref={listRef}
      sx={{
        flexGrow: 1,
        overflow: "auto",
        p: 2,
        bgcolor: "background.default",
        height: isMobile ? "calc(100vh - 112px)" : "calc(100vh - 128px)",
        display: "flex",
        flexDirection: "column",
      }}
      onScroll={handleScroll}
    >
      {messages.map((message) => (
        <ListItem
          key={message._id}
          sx={{
            display: "flex",
            justifyContent:
              message.senderId._id === IsUserLoggedIn._id
                ? "flex-end"
                : "flex-start",
            mb: 2,
          }}
        >
          <MessageBubble
            message={message}
            handleEdit={handleEditMessage}
            handleDelete={handleDeleteMessage}
          />
        </ListItem>
      ))}
      <div ref={messagesEndRef} />
    </List>

    <Box
      sx={{
        p: 2,
        borderTop: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      {typingUsers[selectedUser?._id] && (
        <Typography variant="caption" sx={{ pl: 2, pb: 1 }}>
          {selectedUser.email} is typing...
        </Typography>
      )}
      <Box sx={{ display: "flex" }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={
            editingMessageId ? "Edit message..." : "Type a message..."
          }
          value={inputMessage}
          onChange={handleInputChange}
          sx={{ mr: 1 }}
        />
        <IconButton
          color="primary"
          onClick={editingMessageId ? handleUpdateMessage : handleSendMessage}
          disabled={!inputMessage.trim() || !selectedUser}
        >
          {editingMessageId ? <EditIcon /> : <SendIcon />}
        </IconButton>
      </Box>
    </Box>
  </>
);
  const userManagement = (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
      <FormControl fullWidth>
        <InputLabel id="user-select-label">Add User</InputLabel>
        <Select
          labelId="user-select-label"
          value={selectedUser ? selectedUser._id : ""}
          label="Add User"
          onChange={(e) =>
            setSelectedUser(
              allUsers.find((user) => user._id === e.target.value)
            )
          }
        >
          {allUsers.map((user) => (
            <MenuItem key={user._id} value={user._id}>
              {user.email}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        variant="contained"
        color="primary"
        onClick={handleAddMember}
        disabled={!selectedUser}
        sx={{ mt: 2 }}
      >
        Add Member
      </Button>
    </Box>
  );

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  const userList = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {userManagement}
      <List sx={{ flexGrow: 1, overflow: "auto" }}>
        {members.map((user) => (
          <ListItem
            button
            key={user._id}
            onClick={() => handleUserSelect(user)}
            selected={selectedUser && selectedUser._id === user._id}
          >
            <ListItemAvatar>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                variant="dot"
                color={user.status === "online" ? "success" : "error"}
              >
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  {user.email[0].toUpperCase()}
                </Avatar>
              </Badge>
            </ListItemAvatar>
            <ListItemText
              primary={user.email}
              secondary={<>{user.status === "online" ? "Online" : "Offline"}</>}
              primaryTypographyProps={{ noWrap: true }}
              secondaryTypographyProps={{ noWrap: true }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <AppBar position="static" color="primary">
          <Toolbar>
            {isMobile && selectedUser ? (
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="back"
                sx={{ mr: 2 }}
                onClick={() => setSelectedUser(null)}
              >
                <ArrowBackIcon />
              </IconButton>
            ) : isMobile ? (
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                sx={{ mr: 2 }}
                onClick={toggleDrawer(true)}
              >
                <MenuIcon />
              </IconButton>
            ) : null}
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {selectedUser ? selectedUser.email : "WhatsApp Style Chat"}
            </Typography>
            {selectedUser && (
              <Stack direction="row" spacing={1} alignItems="center">
                <FiberManualRecordIcon
                  sx={{
                    fontSize: 12,
                    color: isOnline[selectedUser._id]
                      ? "success.main"
                      : "error.main",
                  }}
                />
                <Typography variant="body2">
                  {isOnline[selectedUser._id] ? "Online" : "Offline"}
                </Typography>
              </Stack>
            )}
          </Toolbar>
        </AppBar>

        <Box sx={{ display: "flex", flexGrow: 1 }}>
          {!isMobile && (
            <Paper
              elevation={3}
              sx={{
                width: 300,
                flexShrink: 0,
                borderRight: 1,
                borderColor: "divider",
                overflow: "auto",
              }}
            >
              {userList}
            </Paper>
          )}
          <Paper
            elevation={3}
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {(isMobile && selectedUser) || !isMobile ? chatContent : null}
          </Paper>
        </Box>
      </Box>

      <SwipeableDrawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        onOpen={toggleDrawer(true)}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          {userList}
        </Box>
      </SwipeableDrawer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            handleEditMessage(selectedMessageId);
            handleMenuClose();
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleDeleteMessage(selectedMessageId);
            handleMenuClose();
          }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="small"
          onClick={scrollToTop}
          sx={{ position: "fixed", bottom: 16, right: 16 }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>
    </ThemeProvider>
  );
};

export default WhatsAppStyleChatInterface;
